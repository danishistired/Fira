$ErrorActionPreference = "Stop"

$toolsDir = "d:\Projects\argus-eye-guard\tools"
if (-not (Test-Path $toolsDir)) {
    New-Item -ItemType Directory -Path $toolsDir | Out-Null
}

Write-Host "Downloading APKtool..."
$apktoolDir = Join-Path $toolsDir "apktool"
if (-not (Test-Path $apktoolDir)) { New-Item -ItemType Directory -Path $apktoolDir | Out-Null }
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/iBotPeaches/Apktool/master/scripts/windows/apktool.bat" -OutFile "$apktoolDir\apktool.bat"
Invoke-WebRequest -Uri "https://github.com/iBotPeaches/Apktool/releases/download/v2.9.3/apktool_2.9.3.jar" -OutFile "$apktoolDir\apktool.jar"

Write-Host "Downloading JADX..."
$jadxDir = Join-Path $toolsDir "jadx"
if (-not (Test-Path $jadxDir)) { New-Item -ItemType Directory -Path $jadxDir | Out-Null }
$jadxZip = "$toolsDir\jadx.zip"
Invoke-WebRequest -Uri "https://github.com/skylot/jadx/releases/download/v1.4.7/jadx-1.4.7.zip" -OutFile $jadxZip
Expand-Archive -Path $jadxZip -DestinationPath $jadxDir -Force
Remove-Item $jadxZip

Write-Host "Downloading capa..."
$capaDir = Join-Path $toolsDir "capa"
if (-not (Test-Path $capaDir)) { New-Item -ItemType Directory -Path $capaDir | Out-Null }
$capaZip = "$toolsDir\capa.zip"
Invoke-WebRequest -Uri "https://github.com/mandiant/capa/releases/download/v7.0.1/capa-v7.0.1-windows.zip" -OutFile $capaZip
Expand-Archive -Path $capaZip -DestinationPath $capaDir -Force
Remove-Item $capaZip

Write-Host "Downloading Ghidra..."
# Ghidra takes a long time, we'll download a specific version
$ghidraZip = "$toolsDir\ghidra.zip"
Invoke-WebRequest -Uri "https://github.com/NationalSecurityAgency/ghidra/releases/download/Ghidra_11.0.3_build/ghidra_11.0.3_PUBLIC_20240410.zip" -OutFile $ghidraZip
Expand-Archive -Path $ghidraZip -DestinationPath $toolsDir -Force
Remove-Item $ghidraZip
$extractedGhidra = Get-ChildItem -Path $toolsDir -Directory -Filter "ghidra_*"
if ($extractedGhidra) {
    Rename-Item -Path $extractedGhidra.FullName -NewName "ghidra"
}

Write-Host "All standalone tools downloaded successfully."
