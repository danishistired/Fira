$ErrorActionPreference = "Stop"

$toolsDir = Join-Path $PSScriptRoot "tools"
New-Item -ItemType Directory -Path $toolsDir -Force | Out-Null

function Download-File {
    param([string]$Uri, [string]$Destination)
    if (-not (Test-Path $Destination)) {
        Write-Host "Downloading $Uri"
        Invoke-WebRequest -Uri $Uri -OutFile $Destination -UseBasicParsing
    }
}

function Expand-Zip {
    param([string]$ZipPath, [string]$Destination)
    New-Item -ItemType Directory -Path $Destination -Force | Out-Null
    Expand-Archive -Path $ZipPath -DestinationPath $Destination -Force
}

# APKTool
Write-Host "Installing APKTool..."
$apktoolDir = Join-Path $toolsDir "apktool"
New-Item -ItemType Directory -Path $apktoolDir -Force | Out-Null
Download-File "https://raw.githubusercontent.com/iBotPeaches/Apktool/master/scripts/windows/apktool.bat" (Join-Path $apktoolDir "apktool.bat")
Download-File "https://github.com/iBotPeaches/Apktool/releases/download/v2.9.3/apktool_2.9.3.jar" (Join-Path $apktoolDir "apktool.jar")

# JADX
Write-Host "Installing JADX..."
$jadxDir = Join-Path $toolsDir "jadx"
$jadxZip = Join-Path $toolsDir "jadx.zip"
if (-not (Test-Path (Join-Path $jadxDir "bin"))) {
    Download-File "https://github.com/skylot/jadx/releases/download/v1.4.7/jadx-1.4.7.zip" $jadxZip
    Expand-Zip $jadxZip $jadxDir
    Remove-Item $jadxZip -Force -ErrorAction SilentlyContinue
}

# capa
Write-Host "Installing capa..."
$capaDir = Join-Path $toolsDir "capa"
$capaZip = Join-Path $toolsDir "capa.zip"
if (-not (Test-Path (Join-Path $capaDir "capa.exe"))) {
    Download-File "https://github.com/mandiant/capa/releases/download/v7.0.1/capa-v7.0.1-windows.zip" $capaZip
    Expand-Zip $capaZip $capaDir
    Remove-Item $capaZip -Force -ErrorAction SilentlyContinue
}

# Ghidra
Write-Host "Installing Ghidra..."
$ghidraDir = Join-Path $toolsDir "ghidra"
$ghidraZip = Join-Path $toolsDir "ghidra.zip"
if (-not (Test-Path $ghidraDir)) {
    Download-File "https://github.com/NationalSecurityAgency/ghidra/releases/download/Ghidra_11.0.3_build/ghidra_11.0.3_PUBLIC_20240410.zip" $ghidraZip
    $ghidraTemp = Join-Path $toolsDir ".ghidra-temp"
    Expand-Zip $ghidraZip $ghidraTemp
    Remove-Item $ghidraZip -Force -ErrorAction SilentlyContinue
    $ghidraRoot = Get-ChildItem -Path $ghidraTemp -Directory | Where-Object { $_.Name -like "ghidra_*" } | Select-Object -First 1
    if (-not $ghidraRoot) {
        throw "Ghidra archive did not contain a ghidra_* directory"
    }
    Move-Item -Path $ghidraRoot.FullName -Destination $ghidraDir
    Remove-Item $ghidraTemp -Recurse -Force
}

Write-Host "Verifying standalone tools..."
if (-not (Test-Path (Join-Path $apktoolDir "apktool.jar"))) { throw "APKTool installation failed" }
if (-not (Test-Path (Join-Path $jadxDir "bin"))) { throw "JADX installation failed" }
if (-not (Test-Path (Join-Path $capaDir "capa.exe"))) { throw "capa installation failed" }
if (-not (Test-Path $ghidraDir)) { throw "Ghidra installation failed" }

Write-Host "All standalone tools downloaded successfully."
