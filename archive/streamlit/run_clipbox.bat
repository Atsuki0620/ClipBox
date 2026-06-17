@echo off
rem ClipBox legacy Streamlit launcher (archived UI).
rem Streamlit is archived under archive/streamlit/ and is NOT part of the normal
rem Next.js + FastAPI flow. This launcher runs the archived app from the repo root
rem so that core/ and config.py resolve via PYTHONPATH and ui/ resolves via the
rem Streamlit script directory. Do not run while writing from FastAPI/Next.js (no WAL).
cd /d "%~dp0..\.."
set "PYTHONPATH=%CD%"

set VENV_PY=.\venv\Scripts\python.exe
if exist "%VENV_PY%" (
    echo Using venv: %VENV_PY%
    "%VENV_PY%" scripts\startup_backup.py
    if errorlevel 1 (
        echo WARNING: Startup DB backup failed. Continuing startup.
    )
    "%VENV_PY%" -m streamlit run archive\streamlit\streamlit_app.py --server.port 8501
) else (
    echo venv not found. Falling back to system python.
    echo If seaborn is missing, run: python -m pip install -r requirements.txt
    python scripts\startup_backup.py
    if errorlevel 1 (
        echo WARNING: Startup DB backup failed. Continuing startup.
    )
    python -m streamlit run archive\streamlit\streamlit_app.py --server.port 8501
)
