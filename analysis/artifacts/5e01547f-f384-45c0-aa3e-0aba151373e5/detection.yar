rule ARGUS_com_example_demobank1_SUSPICIOUS {
    meta:
        description = "Detects suspicious Android app with accessibility and webview JavaScript enabled indicators"
        author = "ARGUS Auto-Generated"
        verdict = "suspicious"
    strings:
        $s1 = "setJavaScriptEnabled" ascii
        $s2 = "AccessibilityService" ascii
        $s3 = "onAccessibilityEvent" ascii
        $s4 = "com.example.demobank1" ascii
    condition:
        2 of them
}