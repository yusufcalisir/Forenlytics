' Forenlytics Desktop Application Silent Launcher
Option Explicit

Dim fso, scriptDir, rootDir, batPath, WshShell
Set fso = CreateObject("Scripting.FileSystemObject")
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
rootDir = fso.GetParentFolderName(fso.GetParentFolderName(scriptDir))

Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = rootDir

batPath = scriptDir & "\start_desktop.bat"

' Launch start_desktop.bat silently (0 = hidden window)
WshShell.Run "cmd /c """ & batPath & """", 0, False

Set WshShell = Nothing
Set fso = Nothing
