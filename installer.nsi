; Compression algorithm configuration (must be placed at the very beginning of the script)
; Use LZMA algorithm with solid compression (highest compression ratio)
SetCompressor /SOLID lzma

; Set compression dictionary size (optional, range 4-64, unit: MB)
; Larger values provide better compression but increase compression time, 16 or 32 recommended
SetCompressorDictSize 32

; Installer configuration - Define basic software information (these are core settings you need to modify)
!define PRODUCT_NAME "electron-update"  ; Need modification: Your software name
!define PRODUCT_VERSION "1.0.0"       ; Need modification: Your software version number
!define PRODUCT_PUBLISHER "My Company" ; Need modification: Publisher/company name
!define PRODUCT_WEB_SITE "https://www.example.com" ; Need modification: Official website URL
!define INSTALLER_NAME "electron-update-setup-v1.0.0.exe"    ; Can modify: Generated installer filename

; Include modern UI library - Fixed statement, no need to modify
!include "MUI2.nsh"

; Configure default installation directory - Can modify path format
InstallDir "$PROGRAMFILES\${PRODUCT_NAME}"  ; Default installation path, recommended to keep variable format
InstallDirRegKey HKLM "Software\${PRODUCT_NAME}" "InstallDir"  ; Registry record of installation path, no need to modify

; Configure icons - Need modification or deletion
!define MUI_ICON "installer.ico"    ; Need modification: Installer icon path (delete this line if none)
!define MUI_UNICON "uninstall.ico"  ; Need modification: Uninstaller icon path (delete this line if none)

; Step 1: Welcome page - Fixed statement, no need to modify
!insertmacro MUI_PAGE_WELCOME

; Step 2: License agreement page - Need to modify license file
!define MUI_LICENSEPAGE_RADIOBUTTONS  ; Show agree/disagree options, no need to modify
!define MUI_LICENSE_FILE "./License.txt" ; Need modification: License agreement text file path
!insertmacro MUI_PAGE_LICENSE "./License.txt"        ; Generate agreement page, no need to modify

; Step 3: Choose installation directory page - Fixed statement, no need to modify
!insertmacro MUI_PAGE_DIRECTORY

; Step 4: Installation progress page - Fixed statement, no need to modify
!insertmacro MUI_PAGE_INSTFILES

; Step 5: Completion page - Need to modify program filename
!define MUI_FINISHPAGE_RUN "$INSTDIR\electron-update.exe"  ; Need modification: Main program filename (must match actual executable)
!define MUI_FINISHPAGE_SHOWREADME "$INSTDIR\Readme.txt"  ; Can modify: README file path (delete if not needed)
!insertmacro MUI_PAGE_FINISH  ; Generate completion page, no need to modify

; Uninstaller related pages - Fixed statements, no need to modify
!insertmacro MUI_UNPAGE_WELCOME
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_UNPAGE_FINISH

; Language settings - Can add/remove languages as needed
!insertmacro MUI_LANGUAGE "SimpChinese"  ; Simplified Chinese support, recommended to keep
!insertmacro MUI_LANGUAGE "English"      ; English support, can delete if not needed

; Basic installer information - Fixed format, no need to modify (uses previously defined variables)
Name "${PRODUCT_NAME} ${PRODUCT_VERSION}"
OutFile "${INSTALLER_NAME}"

; Main installer logic section - Need modification according to actual files
Section "MainSection" SEC01
    ; Set installation directory as output path - Fixed statement, no need to modify
    SetOutPath "$INSTDIR"

    ; Add files to be installed here - Need modification: Replace with your actual file list
    File "Readme.txt"      ; Description file
    File /r ".\out\win-unpacked\*"      ; Folder and all its contents recursively

    ; Create program shortcuts - Ensure filename matches
    CreateDirectory "$SMPROGRAMS\${PRODUCT_NAME}"  ; Create folder in Start Menu
    CreateShortcut "$SMPROGRAMS\${PRODUCT_NAME}\${PRODUCT_NAME}.lnk" "$INSTDIR\MyApp.exe"  ; Start Menu shortcut (must match main program name)
    CreateShortcut "$DESKTOP\${PRODUCT_NAME}.lnk" "$INSTDIR\MyApp.exe"  ; Desktop shortcut (must match main program name)

    ; Write registry information (for uninstallation and system recognition) - No need to modify (uses previously defined variables)
    WriteRegStr HKLM "Software\${PRODUCT_NAME}" "InstallDir" "$INSTDIR"
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT_NAME}" "DisplayName" "${PRODUCT_NAME}"
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT_NAME}" "DisplayVersion" "${PRODUCT_VERSION}"
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT_NAME}" "Publisher" "${PRODUCT_PUBLISHER}"
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT_NAME}" "UninstallString" "$INSTDIR\uninstall.exe"

    WriteUninstaller "$INSTDIR\uninstall.exe"
SectionEnd

; Uninstaller logic section - Need modification according to installed files
Section "Uninstall"
    ; Delete program shortcuts - Must match those created during installation
    Delete "$SMPROGRAMS\${PRODUCT_NAME}\${PRODUCT_NAME}.lnk"
    RMDir "$SMPROGRAMS\${PRODUCT_NAME}"
    Delete "$DESKTOP\${PRODUCT_NAME}.lnk"

    ; Delete installed files - Need modification: List all files copied during installation
    RMDir /r "$INSTDIR\*"
    RMDir "$INSTDIR"
    ; Add other files to be deleted (corresponding to file list during installation)

    ; Delete installation directory - Fixed statement, no need to modify
    RMDir "$INSTDIR"

    ; Delete registry entries - No need to modify
    DeleteRegKey HKLM "Software\${PRODUCT_NAME}"
    DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT_NAME}"
SectionEnd
