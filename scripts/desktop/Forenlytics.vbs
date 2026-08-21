' Forenlytics Desktop Application Silent Launcher
Set WshShell = CreateObject("WScript.Shell")
strPath = WshShell.CurrentDirectory

' Launch start_desktop.bat silently (0 = hidden window)
WshShell.Run "cmd /c """ & strPath & "\scripts\desktop\start_desktop.bat""", 0, False
Set WshShell = Nothing
