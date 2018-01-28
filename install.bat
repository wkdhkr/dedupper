@echo off
SET stportalPath=C:\Users\Owner\AppData\Roaming\npm\dedupper.cmd

rem add it for all file types
@reg add "HKEY_CLASSES_ROOT\*\shell\dedupper"         /t REG_SZ /v "" /d "dedupper"   /f
@reg add "HKEY_CLASSES_ROOT\*\shell\dedupper\command" /t REG_SZ /v "" /d "%stportalPath% -w -p \"%%1\"" /f

rem add it for folders
@reg add "HKEY_CLASSES_ROOT\Folder\shell\dedupper"         /t REG_SZ /v "" /d "dedupper"   /f
@reg add "HKEY_CLASSES_ROOT\Folder\shell\dedupper\command" /t REG_SZ /v "" /d "%stportalPath% -w -p \"%%1\"" /f

rem add it for all file types dryun
@reg add "HKEY_CLASSES_ROOT\*\shell\dedupper_dryrun"         /t REG_SZ /v "" /d "dedupper dryrun"   /f
@reg add "HKEY_CLASSES_ROOT\*\shell\dedupper_dryrun\command" /t REG_SZ /v "" /d "%stportalPath% -w -n -p \"%%1\"" /f

rem add it for folders dryrun
@reg add "HKEY_CLASSES_ROOT\Folder\shell\dedupper_dryrun"         /t REG_SZ /v "" /d "dedupper dryrun"   /f
@reg add "HKEY_CLASSES_ROOT\Folder\shell\dedupper_dryrun\command" /t REG_SZ /v "" /d "%stportalPath% -w -n -p \"%%1\"" /f

rem add it for all file types
@reg add "HKEY_CLASSES_ROOT\*\shell\dedupper_no_dir"         /t REG_SZ /v "" /d "dedupper no dir"   /f
@reg add "HKEY_CLASSES_ROOT\*\shell\dedupper_no_dir\command" /t REG_SZ /v "" /d "%stportalPath% -D -w -p \"%%1\"" /f

rem add it for folders
@reg add "HKEY_CLASSES_ROOT\Folder\shell\dedupper_no_dir"         /t REG_SZ /v "" /d "dedupper no dir"   /f
@reg add "HKEY_CLASSES_ROOT\Folder\shell\dedupper_no_dir\command" /t REG_SZ /v "" /d "%stportalPath% -D -w -p \"%%1\"" /f

rem add it for all file types dryun
@reg add "HKEY_CLASSES_ROOT\*\shell\dedupper_no_dir_dryrun"         /t REG_SZ /v "" /d "dedupper no dir dryrun"   /f
@reg add "HKEY_CLASSES_ROOT\*\shell\dedupper_no_dir_dryrun\command" /t REG_SZ /v "" /d "%stportalPath% -D -w -n -p \"%%1\"" /f

rem add it for folders dryrun
@reg add "HKEY_CLASSES_ROOT\Folder\shell\dedupper_no_dir_dryrun"         /t REG_SZ /v "" /d "dedupper no dir dryrun"   /f
@reg add "HKEY_CLASSES_ROOT\Folder\shell\dedupper_no_dir_dryrun\command" /t REG_SZ /v "" /d "%stportalPath% -D -w -n -p \"%%1\"" /f