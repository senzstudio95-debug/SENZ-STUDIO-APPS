Unicode true
!include "FileFunc.nsh"
RequestExecutionLevel user
SilentInstall silent
AutoCloseWindow true
Name "SENZ STUDIO 2.9.181"
OutFile "../../SENZ-STUDIO-UPDATE-v2.9.181.exe"
Icon "../../payload/resources/app/exe-icon.ico"
VIProductVersion "2.9.181.0"
VIAddVersionKey "ProductName" "SENZ STUDIO"
VIAddVersionKey "ProductVersion" "2.9.181"
VIAddVersionKey "FileVersion" "2.9.181"
VIAddVersionKey "FileDescription" "SENZ STUDIO - Quick Font Guides Zoom"
VIAddVersionKey "LegalCopyright" "SENZ STUDIO"
SetCompressor /SOLID zlib
Section
 InitPluginsDir
 SetOutPath "$PLUGINSDIR\payload"
 File /r /x ".*" "../../payload/*"
 ClearErrors
 ${GetParameters} $R0
 ExecWait '"$PLUGINSDIR\payload\SENZ-STUDIO.exe" --senz-installer $R0' $0
 IfErrors failed done
 failed:
 MessageBox MB_ICONSTOP "SENZ STUDIO setup could not start. Extract and run the installer again."
 done:
SectionEnd

