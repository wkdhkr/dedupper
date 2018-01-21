@echo off
SET stportalPath=C:\Users\Owner\AppData\Roaming\npm\dedupper.cmd

rem add it for all file types
@reg add "HKEY_CLASSES_ROOT\*\shell\dedupper"         /t REG_SZ /v "" /d "dedupper"   /f
@reg add "HKEY_CLASSES_ROOT\*\shell\dedupper\command" /t REG_SZ /v "" /d "%stportalPath% -v -w -n -p \"%%1\"" /f

rem add it for folders
@reg add "HKEY_CLASSES_ROOT\Folder\shell\dedupper"         /t REG_SZ /v "" /d "dedupper"   /f
@reg add "HKEY_CLASSES_ROOT\Folder\shell\dedupper\command" /t REG_SZ /v "" /d "%stportalPath% -v -w -n -p \"%%1\"" /f