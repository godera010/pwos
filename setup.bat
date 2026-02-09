@echo off
setlocal

echo ===================================================
echo P-WOS ENVIRONMENT SETUP
echo ===================================================

:: 1. Check Python
echo [1/3] Checking Python installation...
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python is not installed or not in PATH.
    echo Please install Python 3.10+ from https://python.org/downloads
    pause
    exit /b 1
)

:: 2. Setup Virtual Environment
echo [2/3] Setting up Virtual Environment...
if not exist ".venv" (
    echo       Creating .venv...
    python -m venv .venv
    if errorlevel 1 (
        echo [ERROR] Failed to create virtual environment.
        pause
        exit /b 1
    )
) else (
    echo       Virtual environment already exists.
)

:: 3. Install Dependencies
echo [3/3] Checking and installing dependencies...
call .venv\Scripts\activate.bat

python -m pip install --upgrade pip >nul 2>&1

if exist "requirements.txt" (
    pip install -r requirements.txt
    if errorlevel 1 (
        echo [ERROR] Failed to install dependencies!
        pause
        exit /b 1
    )
    echo [SUCCESS] All dependencies are installed and ready.
) else (
    echo [WARNING] requirements.txt not found. Skipping dependency install.
)

echo.
echo ===================================================
echo SETUP COMPLETE!
echo You can now run 'start_simulation.bat'
echo ===================================================
pause
