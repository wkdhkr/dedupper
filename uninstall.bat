@echo off

rem delete it for all file types
@reg delete "HKEY_CLASSES_ROOT\*\shell\dedupper"

rem delete it for folders
@reg delete "HKEY_CLASSES_ROOT\Folder\shell\dedupper"

rem delete it for folders
@reg delete "HKEY_CLASSES_ROOT\Folder\shell\dedupper_sweep"

rem delete it for all file types
@reg delete "HKEY_CLASSES_ROOT\*\shell\dedupper_dryrun"

rem delete it for folders
@reg delete "HKEY_CLASSES_ROOT\Folder\shell\dedupper_dryrun"

rem delete it for all file types
@reg delete "HKEY_CLASSES_ROOT\*\shell\dedupper_no_dir"

rem delete it for folders
@reg delete "HKEY_CLASSES_ROOT\Folder\shell\dedupper_no_dir"

rem delete it for all file types
@reg delete "HKEY_CLASSES_ROOT\*\shell\dedupper_no_dir_dryrun"

rem delete it for folders
@reg delete "HKEY_CLASSES_ROOT\Folder\shell\dedupper_no_dir_dryrun"

rem delete it for all file types
@reg delete "HKEY_CLASSES_ROOT\*\shell\dedupper_relocate"

rem delete it for folders
@reg delete "HKEY_CLASSES_ROOT\Folder\shell\dedupper_relocate"

rem delete it for all file types
@reg delete "HKEY_CLASSES_ROOT\*\shell\dedupper_relocate_manual"

rem delete it for folders
@reg delete "HKEY_CLASSES_ROOT\Folder\shell\dedupper_relocate_manual"
pause