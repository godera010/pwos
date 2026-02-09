@echo off
echo ===================================================
echo P-WOS MODEL TRAINER
echo ===================================================

if not exist ".venv" (
    echo [ERROR] Virtual environment not found!
    echo Please run 'setup.bat' first.
    pause
    exit /b 1
)

echo [INFO] Activating environment...
call .venv\Scripts\activate.bat

echo [INFO] Starting training script...
python src/backend/models/train_model.py

echo.
echo ===================================================
echo Training job finished.
echo ===================================================
pause
