@echo off
REM ClipBox 開発サーバー一括起動（Phase 4-A）
REM FastAPI バックエンド（uvicorn :8000）と Next.js フロントエンド（next dev :3000）を並行起動する。
REM 各サーバーは別ウィンドウで開く。停止は各ウィンドウで Ctrl+C。
REM
REM 注意（並走制約）: DB 書き込み主体は当面 Streamlit 側。Next.js から再生/判定/いいねを
REM 検証するときは Streamlit(8501) を停止し、事前に DB バックアップを取ること。
cd /d "%~dp0"

start "ClipBox API (uvicorn:8000)" cmd /k python -m uvicorn api_app:app --host 127.0.0.1 --port 8000 --reload
start "ClipBox Web (next:3000)" cmd /k "cd frontend && npm run dev"

echo.
echo  API : http://localhost:8000/docs
echo  Web : http://localhost:3000
echo.
