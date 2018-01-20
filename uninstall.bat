@echo off
 
rem delete it for all file types
@reg delete "HKEY_CLASSES_ROOT\*\shell\dedupper"
 
rem delete it for folders
@reg delete "HKEY_CLASSES_ROOT\Folder\shell\dedupper"
pause