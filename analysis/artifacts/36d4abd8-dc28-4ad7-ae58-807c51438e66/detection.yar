rule ARGUS_com_browserstack_addnumber_SUSPICIOUS {
    meta:
        description = "Detects suspicious Android app with AccessibilityService, storage access, device ID, and package com.browserstack.addnumber"
        author = "ARGUS Auto-Generated"
        verdict = "suspicious"
    strings:
        $s1 = "AccessibilityService" ascii wide
        $s2 = "getExternalStorageDirectory" ascii wide
        $s3 = "getDeviceId" ascii wide
        $s4 = "com.browserstack.addnumber" ascii
    condition:
        2 of them
}