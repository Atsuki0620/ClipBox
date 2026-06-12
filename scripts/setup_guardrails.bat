@echo off
REM Guardrail setup: run once after clone to prevent video names leaking to GitHub.

echo [1/3] Installing nbstripout...
pip install nbstripout
if %errorlevel% neq 0 (
    echo ERROR: pip install failed.
    exit /b 1
)

echo [2/3] Configuring nbstripout git filter...
git config filter.nbstripout.clean nbstripout
git config filter.nbstripout.smudge cat
git config filter.nbstripout.required false
git config diff.nbstripout.textconv "nbstripout -t"

echo [3/3] Enabling pre-commit hook...
git config core.hooksPath .githooks

echo.
echo Guardrail setup complete.
echo   Layer 1: notebook outputs stripped automatically on git add (nbstripout)
echo   Layer 2: git commit blocked if outputs remain or export files are staged (pre-commit hook)
echo   Layer 3: CI scans all notebooks on push/PR
