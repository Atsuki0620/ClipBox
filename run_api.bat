@echo off
cd /d "%~dp0"

python scripts\startup_backup.py
if errorlevel 1 (
    echo WARNING: Startup DB backup failed. Continuing startup.
)

REM Apply schema/data migrations before launching the API (Next.js stack has no other path)
python scripts\run_migrations.py
if errorlevel 1 (
    echo ERROR: Schema migration could not complete.
    echo If the API is already running with an outdated schema, stop it and run this script again.
    exit /b 1
)

REM ClipBox FastAPI backend launch (Phase 3-A / read-only)
REM Can run alongside Streamlit (8501). Default port 8000.
REM Hot reload enabled in dev. Stop with Ctrl+C.
python -m uvicorn api_app:app --host 127.0.0.1 --port 8000 --reload
