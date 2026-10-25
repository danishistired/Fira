rule ARGUS_com_boi_mpay_SUSPICIOUS {
    meta:
        description = "Detects suspicious indicators found in package com.boi.mpay"
        author = "ARGUS Auto-Generated"
        verdict = "suspicious"
    strings:
        $s1 = "getDeviceId"
        $s2 = "Build.FINGERPRINT"
        $s3 = "getLastKnownLocation"
        $s4 = "openFileOutput("
        $s5 = "ClipboardManager"
        $s6 = "AccessibilityService"
        $s7 = "DevicePolicyManager"
        $s8 = "com.boi.mpay"
    condition:
        2 of them
}