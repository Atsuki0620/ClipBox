@echo off
setlocal EnableExtensions
chcp 65001 >nul
cd /d "%~dp0" || exit /b 1

set "ROOT=%~dp0"
set "FRONTEND=%ROOT%frontend"
set "API_HEALTH_URL=http://127.0.0.1:8000/api/health"
set "WEB_URL=http://localhost:3000"
set "WEB_PRECHECK_FAILED=0"
set "PYTHON_CMD=%ROOT%venv\Scripts\python.exe"
set "API_ALREADY_UP=0"
set "WEB_ALREADY_UP=0"

REM Runtime control（サイドバーからのサービス停止）を有効化（dev 一括起動時のみ）
set "CLIPBOX_ENABLE_RUNTIME_CONTROL=1"

if not exist "%PYTHON_CMD%" set "PYTHON_CMD=python"

echo Starting ClipBox...
"%PYTHON_CMD%" scripts\startup_backup.py
if errorlevel 1 (
    echo WARNING: Startup DB backup failed. Continuing startup.
)

where.exe npm.cmd >nul 2>nul
if errorlevel 1 (
    echo ERROR: npm.cmd was not found. Install Node.js 20 LTS and try again.
    set "WEB_PRECHECK_FAILED=1"
)

if not exist "%FRONTEND%\package.json" (
    echo ERROR: frontend\package.json was not found.
    set "WEB_PRECHECK_FAILED=1"
)

if not exist "%FRONTEND%\node_modules" (
    echo ERROR: frontend\node_modules was not found. Run: cd frontend ^&^& npm install
    set "WEB_PRECHECK_FAILED=1"
)

call :url_ready "%API_HEALTH_URL%" 1
if not errorlevel 1 set "API_ALREADY_UP=1"

if "%WEB_PRECHECK_FAILED%"=="0" (
    call :url_ready "%WEB_URL%" 1
    if not errorlevel 1 set "WEB_ALREADY_UP=1"
)

echo.
if "%API_ALREADY_UP%"=="1" (
    echo FastAPI is already running.
) else (
    echo Starting FastAPI...
    start "" "%PYTHON_CMD%" -m uvicorn api_app:app --host 127.0.0.1 --port 8000 --reload
)

if "%WEB_PRECHECK_FAILED%"=="0" (
    if "%WEB_ALREADY_UP%"=="1" (
        echo Next.js is already running.
    ) else (
        echo Starting Next.js...
        start "" /D "%FRONTEND%" npm.cmd run dev
    )
) else (
    echo Next.js was not started because the precheck failed.
)

echo.
echo Waiting for services...
call :wait_url "API" "%API_HEALTH_URL%" 45
if errorlevel 1 (
    set "API_OK=0"
) else (
    set "API_OK=1"
)

if "%WEB_PRECHECK_FAILED%"=="0" (
    call :wait_url "Next.js" "%WEB_URL%" 90
    if errorlevel 1 (
        set "WEB_OK=0"
    ) else (
        set "WEB_OK=1"
    )
) else (
    set "WEB_OK=0"
)

echo.
if "%API_OK%"=="1" if "%WEB_OK%"=="1" (
    echo API: http://localhost:8000/docs
    echo Web: http://localhost:3000
    echo Opening browser...
    start "" "%WEB_URL%"
    goto :done
)

echo ERROR: Startup failed.
if "%API_OK%"=="0" (
    echo - API did not respond at %API_HEALTH_URL%
    call :port_hint 8000
)
if "%WEB_OK%"=="0" (
    if "%WEB_PRECHECK_FAILED%"=="0" (
        echo - Next.js did not respond at %WEB_URL%
        call :port_hint 3000
    ) else (
        echo - Next.js precheck failed. Check npm.cmd and frontend\node_modules.
    )
)
echo.
echo Check the command windows for details, then run:
echo   http://localhost:3000

:done
echo.
pause
exit /b

:wait_url
set "NAME=%~1"
set "URL=%~2"
set "TRIES=%~3"
for /L %%i in (1,1,%TRIES%) do (
    powershell -NoProfile -ExecutionPolicy Bypass -Command "try { $r = Invoke-WebRequest -UseBasicParsing -Uri '%URL%' -TimeoutSec 2; if ($r.StatusCode -ge 200 -and $r.StatusCode -lt 500) { exit 0 } ; exit 1 } catch { exit 1 }" >nul 2>nul
    if not errorlevel 1 (
        echo %NAME% OK: %URL%
        exit /b 0
    )
    timeout /t 1 /nobreak >nul
)
echo %NAME% ERROR: %URL% did not respond.
exit /b 1

:url_ready
set "URL=%~1"
set "TRIES=%~2"
for /L %%i in (1,1,%TRIES%) do (
    powershell -NoProfile -ExecutionPolicy Bypass -Command "try { $r = Invoke-WebRequest -UseBasicParsing -Uri '%URL%' -TimeoutSec 2; if ($r.StatusCode -ge 200 -and $r.StatusCode -lt 500) { exit 0 } ; exit 1 } catch { exit 1 }" >nul 2>nul
    if not errorlevel 1 exit /b 0
    timeout /t 1 /nobreak >nul
)
exit /b 1

:port_hint
set "PORT=%~1"
powershell -NoProfile -ExecutionPolicy Bypass -Command "if (Get-NetTCPConnection -LocalPort %PORT% -State Listen -ErrorAction SilentlyContinue) { exit 0 } else { exit 1 }" >nul 2>nul
if not errorlevel 1 (
    echo   Port %PORT% is already in use.
) else (
    echo   Port %PORT% is free. Check the startup command or dependencies.
)
exit /b 0
