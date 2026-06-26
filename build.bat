@echo off
:: =============================================================
:: build.bat — NFSU2 Save Data Editor by Piererra
:: One-click PyInstaller build script for Windows
::
:: Requirements:
::   pip install pyinstaller
::
:: Output:
::   dist\NFSU2-SaveEditor.exe
:: =============================================================

title NFSU2 Save Editor — Build

echo.
echo  ============================================
echo   NFSU2 Save Editor — PyInstaller Build
echo   by Piererra
echo  ============================================
echo.

:: Check Python is available
python --version >nul 2>&1
if errorlevel 1 (
    echo  [ERROR] Python not found.
    echo  Install Python 3.10+ from https://python.org
    echo  Make sure to check "Add Python to PATH" during install.
    pause
    exit /b 1
)

:: Check PyInstaller is available
pyinstaller --version >nul 2>&1
if errorlevel 1 (
    echo  [INFO] PyInstaller not found. Installing...
    pip install pyinstaller
    if errorlevel 1 (
        echo  [ERROR] Failed to install PyInstaller.
        pause
        exit /b 1
    )
)

:: Clean previous build artifacts
echo  [INFO] Cleaning previous build...
if exist build   rmdir /s /q build
if exist dist    rmdir /s /q dist
if exist *.spec  del /q *.spec

:: Run PyInstaller
echo  [INFO] Building NFSU2-SaveEditor.exe ...
echo.

pyinstaller ^
    --onefile ^
    --windowed ^
    --name "NFSU2-SaveEditor" ^
    --add-data "nfsu2_editor;nfsu2_editor" ^
    main.py

if errorlevel 1 (
    echo.
    echo  [ERROR] Build failed. Check output above for details.
    pause
    exit /b 1
)

echo.
echo  ============================================
echo   Build complete!
echo   Output: dist\NFSU2-SaveEditor.exe
echo  ============================================
echo.

:: Open output folder
explorer dist

pause
