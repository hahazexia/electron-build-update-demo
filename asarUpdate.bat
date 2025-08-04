@echo off
chcp 65001 >nul 2>&1  :: Set encoding to UTF-8
setlocal enabledelayedexpansion

:: 应用名称（必须与更新文件前缀完全匹配）
set "APP_NAME=electron-update"
set "LATEST_FILE="
set "LATEST_VERSION=0.0.0"
set "LOG_FILE=update.log"

:: 定义前缀（不使用变量嵌套，避免解析问题）
set "PREFIX=electron-update-"

:: 记录开始信息
echo ====================================== 
echo Begin: %date% %time% 
echo ====================================== 
echo Current directory: %cd% 
echo Search pattern: %PREFIX%*.asar 
echo Starting to find update files... 

:: 列出目录文件
echo Listing all files in current directory: 
dir /b 
echo -------------------------------------- 

:: 搜索更新文件
for /f "delims=" %%f in ('dir /b /a-d "%PREFIX%*.asar" 2^>nul') do (
    set "full_filename=%%f"
    set "filename_without_ext=%%~nf"

    echo Debug: Found candidate file - "!full_filename!" 

    :: 提取版本号（使用直接替换前缀）
    call :extractVersion "!filename_without_ext!" "%PREFIX%"

    echo Debug: Extracted version - "!version_part!" 

    :: 比较版本号
    if "!version_part!" gtr "!LATEST_VERSION!" (
        set "LATEST_VERSION=!version_part!"
        set "LATEST_FILE=!full_filename!"
        echo Debug: Updated latest file to - "!full_filename!" 
    )
)

:: 检查是否找到更新文件
if "!LATEST_FILE!"=="" (
    echo Error: No valid update files found 
    echo No valid update files found
    timeout /t 10 /nobreak >nul
    exit /b 1
)

:: 执行更新操作
echo Found latest update: "!LATEST_FILE!" (Version: "!LATEST_VERSION!") 
echo Found latest update: "!LATEST_FILE!"
echo Updating application...

:: 删除旧文件
if exist "app.asar" (
    echo Attempting to delete old app.asar... 
    del /f /q "app.asar"
    if !errorlevel! neq 0 (
        echo Error: Failed to delete old version 
        echo Failed to delete old version
        timeout /t 10 /nobreak >nul
        exit /b 1
    )
)

:: 重命名新文件
echo Renaming "!LATEST_FILE!" to app.asar... 
ren "!LATEST_FILE!" "app.asar"
if !errorlevel! equ 0 (
    echo Success: Application updated successfully 
    echo Application updated successfully
) else (
    echo Error: Failed to rename file 
    echo Update failed (rename error)
    timeout /t 10 /nobreak >nul
    exit /b 1
)

:: 完成日志
echo ====================================== 
echo End: %date% %time% 
echo ====================================== 
echo. 

timeout /t 3 /nobreak >nul
endlocal
exit /b 0

:: 提取版本号的子程序
:extractVersion
set "filename=%~1"
set "prefix=%~2"
set "version_part=!filename:%prefix%=!"
goto :eof
