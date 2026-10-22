$env:ANTHROPIC_BASE_URL="https://api.deepseek.com/anthropic" 
$env:ANTHROPIC_AUTH_TOKEN="sk-REDACTED-DEEPSEEK-KEY"
$env:ANTHROPIC_MODEL="deepseek-v4-pro[1m]"
$env:ANTHROPIC_DEFAULT_OPUS_MODEL="deepseek-v4-pro[1m]"
$env:ANTHROPIC_DEFAULT_SONNET_MODEL="deepseek-v4-pro[1m]"
$env:ANTHROPIC_DEFAULT_HAIKU_MODEL="deepseek-v4-flash"
$env:CLAUDE_CODE_SUBAGENT_MODEL="deepseek-v4-flash"
$env:CLAUDE_CODE_EFFORT_LEVEL="max"

Write-Host "Environment variables configured." -ForegroundColor Green
Write-Host "Starting claude..." -ForegroundColor Cyan

claude
