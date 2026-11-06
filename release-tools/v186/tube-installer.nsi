Unicode true
!include "MUI2.nsh"
RequestExecutionLevel user
Name "SENZ TUBE"
OutFile "../../SENZ-TUBE-Setup-v1.0.1.exe"
InstallDir "$LOCALAPPDATA\Programs\SENZ TUBE"
Icon "../../apps/senz-tube/assets/icon.ico"
UninstallIcon "../../apps/senz-tube/assets/icon.ico"
VIProductVersion "1.0.1.0"
VIAddVersionKey "ProductName" "SENZ TUBE"
VIAddVersionKey "FileDescription" "SENZ TUBE Windows Setup"
VIAddVersionKey "FileVersion" "1.0.1"
VIAddVersionKey "LegalCopyright" "SENZ Studio"
SetCompressor /SOLID zlib
!define MUI_ABORTWARNING
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_INSTFILES
!define MUI_FINISHPAGE_RUN "$INSTDIR\SENZ-TUBE.exe"
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_LANGUAGE "English"
Section
 SetShellVarContext current
 SetOutPath "$INSTDIR"
 File /r "../../tube-payload/*"
 WriteUninstaller "$INSTDIR\Uninstall.exe"
 CreateDirectory "$SMPROGRAMS\SENZ TUBE"
 CreateShortcut "$SMPROGRAMS\SENZ TUBE\SENZ TUBE.lnk" "$INSTDIR\SENZ-TUBE.exe" "" "$INSTDIR\resources\app\assets\icon.ico"
 CreateShortcut "$DESKTOP\SENZ TUBE.lnk" "$INSTDIR\SENZ-TUBE.exe" "" "$INSTDIR\resources\app\assets\icon.ico"
 WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\SENZ TUBE" "DisplayName" "SENZ TUBE"
 WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\SENZ TUBE" "DisplayVersion" "1.0.1"
 WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\SENZ TUBE" "UninstallString" '$\"$INSTDIR\Uninstall.exe$\"'
 WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\SENZ TUBE" "DisplayIcon" "$INSTDIR\resources\app\assets\icon.ico"
SectionEnd
Section "Uninstall"
 SetShellVarContext current
 Delete "$DESKTOP\SENZ TUBE.lnk"
 RMDir /r "$SMPROGRAMS\SENZ TUBE"
 RMDir /r "$INSTDIR"
 DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\SENZ TUBE"
SectionEnd
