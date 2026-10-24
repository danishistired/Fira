rule ARGUS_com_android_insecurebankv2_HIGH-RISK {
    meta:
        description = "Android malware detection based on indicators from com.android.insecurebankv2"
        author = "ARGUS Auto-Generated"
        verdict = "high-risk"
    strings:
        $s1 = "AccessibilityService" ascii wide
        $s2 = "getExternalStorageDirectory" ascii wide
        $s3 = "getDeviceId" ascii wide
        $s4 = "openFileOutput(" ascii wide
        $s5 = "com.android.insecurebankv2" ascii wide
    condition:
        2 of