rule ARGUS_com_android_insecurebankv2_SUSPICIOUS {
    meta:
        description = "Detects Android app com.android.insecurebankv2 with suspicious API usage"
        author = "ARGUS Auto-Generated"
        verdict = "suspicious"
    strings:
        $s1 = "AccessibilityService"
        $s2 = "getExternalStorageDirectory"
        $s3 = "getDeviceId"
        $s4 = "openFileOutput("
        $s5 = "com.android.insecurebankv2"
    condition:
        2 of them
}