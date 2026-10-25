rule ARGUS_com_example_demobank1_SUSPICIOUS {
    meta:
        description = "Detects suspicious Android app containing accessibility service APIs, enabled JavaScript, and package identifier associated with com.example.demobank1"
        author = "ARGUS Auto-Generated"
        verdict = "suspicious"
    strings:
        $js = "setJavaScriptEnabled(true)"
        $acc_service = "AccessibilityService"
        $acc_event = "onAccessibilityEvent"
        $pkg = "com.example.demobank1"
    condition:
        2 of them
}