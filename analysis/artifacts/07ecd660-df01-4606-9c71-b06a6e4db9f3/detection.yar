rule ARGUS_com_apkshield_installer_c2c9b008d_SUSPICIOUS {
    meta:
        description = "Detects suspicious Android package com.apkshield.installer.c2c9b008d using Build.FINGERPRINT"
        author = "ARGUS Auto-Generated"
        verdict = "suspicious"
    strings:
        $a = "Build.FINGERPRINT" ascii wide