rule ARGUS_com_example_demobank1_SUSPICIOUS {
    meta:
        description = "Detects suspicious indicators for package com.example.demobank1"
        author = "ARGUS Auto-Generated"
        verdict = "suspicious"
    strings:
        $s1 = "com.example.demobank1" ascii wide
        $s2 = "com/example/demobank1" ascii wide
        $s3 = "Lcom/example/demobank1;" ascii wide
        $s4 = "demobank1" ascii wide
    condition:
        2 of them
}