Dim args
Dim up
For i = 0 To WScript.Arguments.Count - 1
   args = args + " """ + WScript.Arguments(i) + """"
Next
Set oShell = CreateObject("Wscript.Shell")
up = oShell.ExpandEnvironmentStrings("%USERPROFILE%")
oShell.Run "node " + up + "\AppData\Roaming\npm\node_modules\dedupper\bin\dedupper.js" + args, 0