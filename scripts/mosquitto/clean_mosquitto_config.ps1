$confPath = "C:\Program Files\mosquitto\mosquitto.conf"

# Read the config
$content = Get-Content $confPath -Raw

# Remove all PWOS blocks (both old and new markers)
$cleaned = $content -replace '(?s)\r?\n?\s*# --- PWOS Network Fix ---[^\r\n]*\r?\nlistener 1883[^\r\n]*\r?\nallow_anonymous true[^\r\n]*\r?\n(listener 9001[^\r\n]*\r?\n)?(protocol websockets[^\r\n]*\r?\n)?\s*', ''
$cleaned = $cleaned -replace '(?s)\r?\n?\s*# --- PWOS Clean Config ---[^\r\n]*\r?\nlistener 1883[^\r\n]*\r?\nallow_anonymous true[^\r\n]*\r?\n(listener 9001[^\r\n]*\r?\n)?(protocol websockets[^\r\n]*\r?\n)?\s*', ''

# Trim trailing whitespace
$cleaned = $cleaned.TrimEnd()

# Add clean PWOS config
$cleaned += "`r`n`r`n# --- PWOS Clean Config ---`r`nlistener 1883 0.0.0.0`r`nallow_anonymous true`r`n`r`nlistener 9001`r`nprotocol websockets`r`n"

# Write it back
Set-Content -Path $confPath -Value $cleaned -NoNewline
Write-Host "Config cleaned and PWOS block added."
Write-Host ""
Write-Host "Last 10 lines:"
Get-Content $confPath -Tail 10
