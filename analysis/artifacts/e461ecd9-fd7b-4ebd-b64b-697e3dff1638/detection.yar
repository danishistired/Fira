rule ARGUS_com_example_demobank1_HIGH-RISK {
    meta:
        description = "Detects Android malware indicators observed in package com.example.demobank1"
        author = "ARGUS Auto-Generated"
        verdict = "high-risk"
    strings:
        $s1 = "setJavaScriptEnabled(true)"
        $s2 = "AccessibilityService"
        $s3 = "onAccessibilityEvent"
        $s4 = "com.example.demobank1"
    condition:
        uint16(0) == 0x5A4D or #s1 >= 2 or #s2 >= 2 or #s3 >= 2 or #s4 >= 2 or (#s1 + #s2 + #s3 + #s4) >= 2
}