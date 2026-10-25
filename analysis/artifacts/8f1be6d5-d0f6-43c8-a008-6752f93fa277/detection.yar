rule ARGUS_com_rvdatuv_android_SUSPICIOUS {
    meta:
        description = "Detects suspicious Android package com.rvdatuv.android with getDeviceId API usage"
        author = "ARGUS Auto-Generated"
        verdict = "suspicious"
    strings:
        $s1 = "getDeviceId"
        $s2 = "com.rvdatuv.android"
    condition:
        2 of them
}