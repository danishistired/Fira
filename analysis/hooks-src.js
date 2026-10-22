// Frida hooks for ARGUS Dynamic Analysis
// Phase 2: Extended with 4 new categories:
//   7. DexClassLoader (dynamic code loading — dropper/plugin behavior)
//   8. Reflection (Class.forName + Method.invoke — evasion)
//   9. ContentResolver (contacts/SMS/call-log DB reads — data theft)
//  10. SharedPreferences (sensitive local storage access)
//  11. Native syscall hooks: connect() and open() via Interceptor.attach
//
// Frida 17.x: Java bridge must be explicitly imported
const _bridge = require('frida-java-bridge');
const Java = _bridge.default || _bridge;

var logs = [];

function log(msg) {
    var timestamp = new Date().toISOString();
    var logMsg = `[${timestamp}] ${msg}`;
    send({ "type": "log", "data": logMsg });
}

// Wait for Java VM to be ready (needed when using Frida spawn mode)
var _javaRetries = 0;
var _MAX_JAVA_RETRIES = 300;  // 30s @ 100ms intervals
function waitForJava(callback) {
    if (typeof Java !== 'undefined' && Java.available) {
        Java.perform(callback);
    } else {
        _javaRetries++;
        if (_javaRetries > _MAX_JAVA_RETRIES) {
            log("ERROR: Java VM did not become available after " + (_MAX_JAVA_RETRIES * 100 / 1000) + "s — giving up.");
            send({ "type": "error", "data": "Java VM timeout after 30s" });
            return;
        }
        if (_javaRetries === 1 || _javaRetries % 50 === 0) {
            log("Waiting for Java VM to initialize... (attempt " + _javaRetries + ")");
        }
        setTimeout(function () { waitForJava(callback); }, 100);
    }
}

waitForJava(function () {
    log("Frida hooks injected successfully.");

    // 1. Hook Cryptography (javax.crypto.Cipher)
    try {
        var Cipher = Java.use('javax.crypto.Cipher');
        Cipher.init.overload('int', 'java.security.Key').implementation = function (opmode, key) {
            var mode = (opmode === 1) ? "ENCRYPT" : (opmode === 2) ? "DECRYPT" : opmode;
            log(`Crypto API: Cipher.init() called for ${mode} mode with key algorithm: ${key.getAlgorithm()}`);
            this.init(opmode, key);
        };
        Cipher.doFinal.overload('[B').implementation = function (input) {
            log(`Crypto API: Cipher.doFinal() called with payload length: ${input.length} bytes`);
            return this.doFinal(input);
        };
    } catch (e) {
        log(`Failed to hook Cipher: ${e}`);
    }

    // 2. Hook Runtime Execution (java.lang.Runtime)
    try {
        var Runtime = Java.use('java.lang.Runtime');
        Runtime.exec.overload('java.lang.String').implementation = function (cmd) {
            log(`Command Execution: Runtime.exec("${cmd}")`);
            return this.exec(cmd);
        };
        Runtime.exec.overload('[Ljava.lang.String;').implementation = function (cmdArray) {
            log(`Command Execution: Runtime.exec([${cmdArray.join(", ")}])`);
            return this.exec(cmdArray);
        };
    } catch (e) {
        log(`Failed to hook Runtime: ${e}`);
    }

    // 3. Hook SMS Sending (android.telephony.SmsManager)
    try {
        var SmsManager = Java.use('android.telephony.SmsManager');
        SmsManager.sendTextMessage.overload('java.lang.String', 'java.lang.String', 'java.lang.String', 'android.app.PendingIntent', 'android.app.PendingIntent').implementation = function (dest, scAddress, text, sentIntent, deliveryIntent) {
            log(`SMS Manager: Sending SMS to ${dest} with text: "${text}"`);
            this.sendTextMessage(dest, scAddress, text, sentIntent, deliveryIntent);
        };
    } catch (e) {
        log(`Failed to hook SmsManager: ${e}`);
    }

    // 4. Hook Network Connections (java.net.URL)
    try {
        var URL = Java.use('java.net.URL');
        URL.$init.overload('java.lang.String').implementation = function (url) {
            log(`Network Connection: Opening URL -> ${url}`);
            this.$init(url);
        };
    } catch (e) {
        log(`Failed to hook URL: ${e}`);
    }

    // 5. Hook Base64 Decoding (android.util.Base64) - Often used for obfuscated strings/payloads
    try {
        var Base64 = Java.use('android.util.Base64');
        Base64.decode.overload('java.lang.String', 'int').implementation = function (str, flags) {
            log(`Obfuscation/Data: Base64 decode string: "${str.substring(0, 50)}${str.length > 50 ? '...' : ''}"`);
            return this.decode(str, flags);
        };
    } catch (e) {
        log(`Failed to hook Base64: ${e}`);
    }

    // 6. Hook File I/O (java.io.File)
    try {
        var File = Java.use('java.io.File');
        File.$init.overload('java.lang.String').implementation = function (pathname) {
            // Filter out noise from standard framework files if needed
            if (!pathname.startsWith("/system/") && !pathname.startsWith("/data/app/")) {
                log(`File Access: new File("${pathname}")`);
            }
            this.$init(pathname);
        };
    } catch (e) {
        log(`Failed to hook File: ${e}`);
    }

    // ======================================================
    // Phase 2: New hooks — deeper behavior coverage
    // ======================================================

    // 7. DexClassLoader — dynamic code loading (dropper/plugin behavior)
    // Maps to MITRE T1059.001 (Dynamic Code Loading)
    try {
        var DexClassLoader = Java.use('dalvik.system.DexClassLoader');
        DexClassLoader.$init.implementation = function (dexPath, optimizedDirectory, librarySearchPath, parent) {
            log(`Dynamic Code Load: DexClassLoader loading DEX/APK from: "${dexPath}"`);
            this.$init(dexPath, optimizedDirectory, librarySearchPath, parent);
        };
    } catch (e) {
        log(`Failed to hook DexClassLoader: ${e}`);
    }

    // Also hook PathClassLoader (used by some droppers)
    try {
        var PathClassLoader = Java.use('dalvik.system.PathClassLoader');
        PathClassLoader.$init.overload('java.lang.String', 'java.lang.ClassLoader').implementation = function (path, parent) {
            if (!path.startsWith("/data/app/")) {  // filter framework loading
                log(`Dynamic Code Load: PathClassLoader loading from: "${path}"`);
            }
            return this.$init(path, parent);
        };
    } catch (e) {
        log(`Failed to hook PathClassLoader: ${e}`);
    }

    // 8. Reflection — evasion via Class.forName + Method.invoke
    // Malware uses reflection to call sensitive APIs without direct imports
    try {
        var JavaClass = Java.use('java.lang.Class');
        JavaClass.forName.overload('java.lang.String').implementation = function (className) {
            // Only log classes that look suspicious (not android.*/java.*)
            if (!className.startsWith("android.") &&
                !className.startsWith("java.") &&
                !className.startsWith("javax.") &&
                !className.startsWith("com.google.") &&
                !className.startsWith("kotlin.")) {
                log(`Reflection: Class.forName("${className}")`);
            }
            return this.forName(className);
        };
    } catch (e) {
        log(`Failed to hook Class.forName: ${e}`);
    }

    try {
        var Method = Java.use('java.lang.reflect.Method');
        Method.invoke.implementation = function (obj, args) {
            var methodName = this.getName();
            var declaringClass = this.getDeclaringClass().getName();
            // Only log potentially sensitive method invocations
            var sensitiveClasses = ["TelephonyManager", "SmsManager", "Runtime", "ProcessBuilder",
                                    "DexClassLoader", "URLClassLoader", "Camera"];
            if (sensitiveClasses.some(c => declaringClass.includes(c))) {
                log(`Reflection: Method.invoke() on ${declaringClass}.${methodName}()`);
            }
            return this.invoke(obj, args);
        };
    } catch (e) {
        log(`Failed to hook Method.invoke: ${e}`);
    }

    // 9. ContentResolver — reading sensitive Android databases (contacts, SMS, call log)
    // Maps to MITRE T1636 (Access Contact List), T1636.003 (SMS Messages)
    try {
        var ContentResolver = Java.use('android.content.ContentResolver');
        ContentResolver.query.overload(
            'android.net.Uri', '[Ljava.lang.String;', 'java.lang.String',
            '[Ljava.lang.String;', 'java.lang.String'
        ).implementation = function (uri, projection, selection, selectionArgs, sortOrder) {
            var uriStr = uri ? uri.toString() : "null";
            // Only log sensitive content URIs
            var sensitive = ["contacts", "sms", "call_log", "calendar", "media", "telephony"];
            if (sensitive.some(s => uriStr.includes(s))) {
                log(`Data Access: ContentResolver.query("${uriStr}") — reading ${uriStr.includes("contacts") ? "contacts" : uriStr.includes("sms") ? "SMS messages" : uriStr.includes("call_log") ? "call log" : "sensitive data"}`);
            }
            return this.query(uri, projection, selection, selectionArgs, sortOrder);
        };
    } catch (e) {
        log(`Failed to hook ContentResolver: ${e}`);
    }

    // 10. SharedPreferences — reading/writing local key-value storage
    // Malware often stores C2 config, harvested creds, or activation flags here
    try {
        var SharedPreferencesImpl = Java.use('android.app.SharedPreferencesImpl');
        SharedPreferencesImpl.getString.implementation = function (key, defValue) {
            var result = this.getString(key, defValue);
            // Log reads of potentially sensitive keys
            var sensitiveKeys = ["password", "token", "secret", "key", "api", "auth", "credentials", "c2", "server", "url"];
            if (key && sensitiveKeys.some(k => key.toLowerCase().includes(k))) {
                log(`SharedPreferences: getString("${key}") = "${result ? result.substring(0, 50) : 'null'}"`);
            }
            return result;
        };
    } catch (e) {
        log(`Failed to hook SharedPreferences: ${e}`);
    }

    // 11. OkHttp3 — widely used HTTP client in Android apps
    // Catches network calls that bypass java.net.URL hooks
    try {
        var OkHttpClient = Java.use("okhttp3.OkHttpClient");
        var Request = Java.use("okhttp3.Request");
        var RealCall = Java.use("okhttp3.internal.connection.RealCall");
        RealCall.execute.implementation = function () {
            try {
                var req = this.request();
                var url = req.url().toString();
                var method = req.method();
                log(`Network Connection (OkHttp): ${method} ${url}`);
            } catch (e2) { /* ignore */ }
            return this.execute();
        };
    } catch (e) {
        log(`Failed to hook OkHttp3: ${e}`);
    }
});

// ======================================================
// Phase 2: Native-layer syscall hooks
// Hook connect() and open() at the libc/linker level.
// These catch cases where native code bypasses Java entirely.
// ======================================================

try {
    // Hook libc connect() — catches raw socket connections
    var connectPtr = Module.findExportByName("libc.so", "connect");
    if (connectPtr) {
        Interceptor.attach(connectPtr, {
            onEnter: function (args) {
                try {
                    var sockfd = args[0].toInt32();
                    var addrlen = args[2].toInt32();
                    if (addrlen >= 16) {
                        // Try to read sin_addr (IPv4: bytes 4-7 of sockaddr_in)
                        var sinFamily = args[1].readU16();
                        if (sinFamily === 2) { // AF_INET
                            var port = ((args[1].add(2).readU8() << 8) | args[1].add(3).readU8());
                            var ip = [
                                args[1].add(4).readU8(),
                                args[1].add(5).readU8(),
                                args[1].add(6).readU8(),
                                args[1].add(7).readU8(),
                            ].join(".");
                            if (ip !== "0.0.0.0" && ip !== "127.0.0.1") {
                                log(`Native: connect() to ${ip}:${port} (AF_INET)`);
                            }
                        }
                    }
                } catch (e2) { /* ignore parsing errors */ }
            }
        });
        log("Native hook: connect() installed");
    }
} catch (e) {
    log(`Failed to hook native connect(): ${e}`);
}

try {
    // Hook libc open() — catches native file access outside Java's File class
    var openPtr = Module.findExportByName("libc.so", "open");
    if (openPtr) {
        Interceptor.attach(openPtr, {
            onEnter: function (args) {
                try {
                    var path = args[0].readUtf8String();
                    // Only log suspicious paths (not system, proc, or dev)
                    if (path && !path.startsWith("/system") && !path.startsWith("/proc")
                        && !path.startsWith("/dev") && !path.startsWith("/apex")) {
                        if (path.includes(".dex") || path.includes(".apk") ||
                            path.includes("/sdcard") || path.includes("/data/data")) {
                            log(`Native: open("${path}")`);
                        }
                    }
                } catch (e2) { /* ignore */ }
            }
        });
        log("Native hook: open() installed");
    }
} catch (e) {
    log(`Failed to hook native open(): ${e}`);
}

