// Frida hooks for ARGUS Dynamic Analysis
// This script is injected into the target application to monitor its behavior
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
function waitForJava(callback) {
    if (Java.available) {
        Java.perform(callback);
    } else {
        log("Waiting for Java VM to initialize...");
        setTimeout(function() { waitForJava(callback); }, 100);
    }
}

waitForJava(function() {
    log("Frida hooks injected successfully.");

    // 1. Hook Cryptography (javax.crypto.Cipher)
    try {
        var Cipher = Java.use('javax.crypto.Cipher');
        Cipher.init.overload('int', 'java.security.Key').implementation = function(opmode, key) {
            var mode = (opmode === 1) ? "ENCRYPT" : (opmode === 2) ? "DECRYPT" : opmode;
            log(`Crypto API: Cipher.init() called for ${mode} mode with key algorithm: ${key.getAlgorithm()}`);
            this.init(opmode, key);
        };
        Cipher.doFinal.overload('[B').implementation = function(input) {
            log(`Crypto API: Cipher.doFinal() called with payload length: ${input.length} bytes`);
            return this.doFinal(input);
        };
    } catch (e) {
        log(`Failed to hook Cipher: ${e}`);
    }

    // 2. Hook Runtime Execution (java.lang.Runtime)
    try {
        var Runtime = Java.use('java.lang.Runtime');
        Runtime.exec.overload('java.lang.String').implementation = function(cmd) {
            log(`Command Execution: Runtime.exec("${cmd}")`);
            return this.exec(cmd);
        };
        Runtime.exec.overload('[Ljava.lang.String;').implementation = function(cmdArray) {
            log(`Command Execution: Runtime.exec([${cmdArray.join(", ")}])`);
            return this.exec(cmdArray);
        };
    } catch (e) {
        log(`Failed to hook Runtime: ${e}`);
    }

    // 3. Hook SMS Sending (android.telephony.SmsManager)
    try {
        var SmsManager = Java.use('android.telephony.SmsManager');
        SmsManager.sendTextMessage.overload('java.lang.String', 'java.lang.String', 'java.lang.String', 'android.app.PendingIntent', 'android.app.PendingIntent').implementation = function(dest, scAddress, text, sentIntent, deliveryIntent) {
            log(`SMS Manager: Sending SMS to ${dest} with text: "${text}"`);
            this.sendTextMessage(dest, scAddress, text, sentIntent, deliveryIntent);
        };
    } catch (e) {
        log(`Failed to hook SmsManager: ${e}`);
    }

    // 4. Hook Network Connections (java.net.URL)
    try {
        var URL = Java.use('java.net.URL');
        URL.$init.overload('java.lang.String').implementation = function(url) {
            log(`Network Connection: Opening URL -> ${url}`);
            this.$init(url);
        };
    } catch (e) {
        log(`Failed to hook URL: ${e}`);
    }

    // 5. Hook Base64 Decoding (android.util.Base64) - Often used for obfuscated strings/payloads
    try {
        var Base64 = Java.use('android.util.Base64');
        Base64.decode.overload('java.lang.String', 'int').implementation = function(str, flags) {
            log(`Obfuscation/Data: Base64 decode string: "${str.substring(0, 50)}${str.length > 50 ? '...' : ''}"`);
            return this.decode(str, flags);
        };
    } catch (e) {
        log(`Failed to hook Base64: ${e}`);
    }
    
    // 6. Hook File I/O (java.io.File)
    try {
        var File = Java.use('java.io.File');
        File.$init.overload('java.lang.String').implementation = function(pathname) {
            // Filter out noise from standard framework files if needed
            if (!pathname.startsWith("/system/") && !pathname.startsWith("/data/app/")) {
                log(`File Access: new File("${pathname}")`);
            }
            this.$init(pathname);
        };
    } catch (e) {
        log(`Failed to hook File: ${e}`);
    }
});
