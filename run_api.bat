@echo off
cd /d "%~dp0"

python scripts\startup_backup.py
if errorlevel 1 (
    echo WARNING: Startup DB backup failed. Continuing startup.
)

REM ClipBox FastAPI バックエンド起動（Phase 3-A / read-only）
REM Streamlit(8501) と並走可能。既定ポート 8000。
REM 開発時はホットリロード有効。停止は Ctrl+C。
python -m uvicorn api_app:app --host 127.0.0.1 --port 8000 --reload
