@echo off
SET stportalPath=%USERPROFILE%\AppData\Roaming\npm\dedupper.cmd

rem add it for all file types
@reg add "HKEY_CLASSES_ROOT\*\shell\dedupper"         /t REG_SZ /v "" /d "dedupper"   /f
@reg add "HKEY_CLASSES_ROOT\*\shell\dedupper\command" /t REG_SZ /v "" /d "%stportalPath% -w -p \"%%1\"" /f

rem add it for folders
@reg add "HKEY_CLASSES_ROOT\Folder\shell\dedupper"         /t REG_SZ /v "" /d "dedupper"   /f
@reg add "HKEY_CLASSES_ROOT\Folder\shell\dedupper\command" /t REG_SZ /v "" /d "%stportalPath% -w -p \"%%1\"" /f

rem add it for folders sweep
@reg add "HKEY_CLASSES_ROOT\Folder\shell\dedupper_sweep"         /t REG_SZ /v "" /d "dedupper sweep"   /f
@reg add "HKEY_CLASSES_ROOT\Folder\shell\dedupper_sweep\command" /t REG_SZ /v "" /d "%stportalPath% -w -s -p \"%%1\"" /f

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
@reg add "hkey_classes_root\folder\shell\dedupper_no_dir_dryrun"         /t reg_sz /v "" /d "dedupper no dir dryrun"   /f
@reg add "hkey_classes_root\folder\shell\dedupper_no_dir_dryrun\command" /t reg_sz /v "" /d "%stportalpath% -D -w -n -p \"%%1\"" /f

rem add it for all file types relocate
@reg add "HKEY_CLASSES_ROOT\*\shell\dedupper_relocate"         /t REG_SZ /v "" /d "dedupper relocate"   /f
@reg add "HKEY_CLASSES_ROOT\*\shell\dedupper_relocate\command" /t REG_SZ /v "" /d "%stportalPath% -r -w -p \"%%1\"" /f

rem add it for folders relocate
@reg add "hkey_classes_root\folder\shell\dedupper_relocate"         /t reg_sz /v "" /d "dedupper relocate"   /f
@reg add "hkey_classes_root\folder\shell\dedupper_relocate\command" /t reg_sz /v "" /d "%stportalpath% -r -w -p \"%%1\"" /f

rem add it for all file types relocate manual
@reg add "HKEY_CLASSES_ROOT\*\shell\dedupper_relocate_manual"         /t REG_SZ /v "" /d "dedupper relocate manual"   /f
@reg add "HKEY_CLASSES_ROOT\*\shell\dedupper_relocate_manual\command" /t REG_SZ /v "" /d "%stportalPath% -r -m -w -p \"%%1\"" /f

rem add it for folders relocate manual
@reg add "hkey_classes_root\folder\shell\dedupper_relocate_manual"         /t reg_sz /v "" /d "dedupper relocate manual"   /f
@reg add "hkey_classes_root\folder\shell\dedupper_relocate_manual\command" /t reg_sz /v "" /d "%stportalpath% -r -m -w -p \"%%1\"" /f
