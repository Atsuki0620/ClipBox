@echo off
rem ClipBox launcher (uses local venv if available to avoid missing seaborn)
cd /d %~dp0

set VENV_PY=.\venv\Scripts\python.exe
if exist "%VENV_PY%" (
    echo Using venv: %VENV_PY%
    "%VENV_PY%" scripts\startup_backup.py
    if errorlevel 1 (
        echo WARNING: Startup DB backup failed. Continuing startup.
    )
    "%VENV_PY%" -m streamlit run streamlit_app.py --server.port 8501
) else (
    echo venv not found. Falling back to system python.
    echo If seaborn is missing, run: python -m pip install -r requirements.txt
    python scripts\startup_backup.py
    if errorlevel 1 (
        echo WARNING: Startup DB backup failed. Continuing startup.
    )
    python -m streamlit run streamlit_app.py --server.port 8501
)
