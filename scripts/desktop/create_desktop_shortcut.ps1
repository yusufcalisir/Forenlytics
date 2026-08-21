# ==============================================================================
# Forenlytics Windows Desktop Shortcut Creator
# ==============================================================================

$RootDir = (Resolve-Path (Join-Path $PSScriptRoot "../..")).Path
$DesktopPath = [Environment]::GetFolderPath("Desktop")
$ShortcutPath = Join-Path $DesktopPath "Forenlytics.lnk"
$IconPath = Join-Path $RootDir "desktop\icon.ico"
$TargetScript = Join-Path $RootDir "scripts\desktop\start_desktop.bat"

Write-Host "[*] Creating Forenlytics Desktop Shortcut..." -ForegroundColor Yellow

$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut($ShortcutPath)
$Shortcut.TargetPath = $TargetScript
$Shortcut.WorkingDirectory = $RootDir
$Shortcut.IconLocation = "$IconPath, 0"
$Shortcut.Description = "Forenlytics - Forensic Audio Intelligence & Deepfake Detection Platform"
$Shortcut.Save()

Write-Host "[OK] Desktop shortcut created successfully at:" -ForegroundColor Green
Write-Host "     $ShortcutPath" -ForegroundColor Cyan
