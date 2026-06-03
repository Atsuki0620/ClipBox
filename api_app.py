"""
ClipBox - FastAPI エントリーポイント（Phase 3-A 基盤）。

役割:
    Streamlit(8501) と並走する HTTP API（既定 8000）を起動する。`core/` を共有し、
    動画データを read-only で配信する。将来 Next.js のバックエンドとなる。

【設計制約】
- ルーターは `core.app_service` のファサード経由でのみ DB にアクセスする。
- `streamlit` を import しない。
- Phase 3-A は read-only。起動時に DB の存在確認（read）のみ行い、
  `init_database` / `run_startup_migration`（書き込み）は実行しない
  （並走中の SQLite 同時書き込みを避けるため。DB 初期化・移行は Streamlit 側が担う）。

【依存関係】
api_app → api.videos.router → core.app_service
起動: `uvicorn api_app:app --host 127.0.0.1 --port 8000`（run_api.bat 参照）
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core import app_service
from core.logger import get_logger
from api import videos
from api.schemas import HealthResponse

logger = get_logger(__name__)

# Next.js 開発/常用サーバー（同一マシン）からのアクセスを許可
ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]


@asynccontextmanager
async def lifespan(app: FastAPI):
    """起動時の read-only 健全性チェック（書き込みはしない）。"""
    if app_service.check_database_exists():
        logger.info("api_startup db_exists=true")
    else:
        # 停止はせず警告のみ。DB 初期化は Streamlit 側に委ねる。
        logger.warning("api_startup db_exists=false reason=database_not_initialized")
    yield


app = FastAPI(title="ClipBox API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(videos.router, prefix="/api")


@app.get("/api/health", response_model=HealthResponse)
def health() -> HealthResponse:
    """ヘルスチェック。DB ファイルの存在を read-only で返す。"""
    return HealthResponse(status="ok", db_exists=app_service.check_database_exists())
