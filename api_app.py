"""
ClipBox - FastAPI エントリーポイント。

役割:
    Streamlit(8501) と並走する HTTP API（既定 8000）を起動する。`core/` を共有し、
    動画 read/mutation・統計・分析・AVP 起動を提供する。将来 Next.js のバックエンドとなる。

【設計制約】
- ルーターは `core.app_service` のファサード経由でのみ DB にアクセスする。
- `streamlit` を import しない。
- **起動時 lifespan は read-only を維持する**。DB の存在確認（read）のみ行い、
  `init_database` / `run_startup_migration`（書き込み）は実行しない
  （並走中の SQLite 同時書き込みを避けるため。DB 初期化・移行は Streamlit 側が担う）。
- mutation（play/level/like/scan/config/backup/avp）は並走中の同時書き込みを避ける運用前提。
- **Runtime control（dev/ops 用）は既定で無効**。`CLIPBOX_ENABLE_RUNTIME_CONTROL=1` のときのみ
  `/api/runtime*` を公開する（ブラウザからプロセス停止できる強い副作用のため明示有効化）。

【依存関係】
api_app → api.{videos,stats,actions,likes,admin,analysis,avp,runtime}.router → core.app_service
起動: `uvicorn api_app:app --host 127.0.0.1 --port 8000`（run_api.bat / run_dev.bat 参照）
"""

import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core import app_service
from core.logger import get_logger
from api import videos, stats, actions, likes, admin, analysis, avp, runtime
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


def _runtime_control_enabled() -> bool:
    return os.getenv("CLIPBOX_ENABLE_RUNTIME_CONTROL") == "1"


def create_app(enable_runtime_control: bool | None = None) -> FastAPI:
    """FastAPI アプリを構築する。

    Args:
        enable_runtime_control: runtime ルーターを公開するか。None のとき環境変数
            `CLIPBOX_ENABLE_RUNTIME_CONTROL == "1"` を参照する（テストでは明示指定する）。
    """
    if enable_runtime_control is None:
        enable_runtime_control = _runtime_control_enabled()

    app = FastAPI(title="ClipBox API", version="0.1.0", lifespan=lifespan)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=ALLOWED_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(videos.router, prefix="/api")
    app.include_router(stats.router, prefix="/api")
    app.include_router(actions.router, prefix="/api")
    app.include_router(likes.router, prefix="/api")
    app.include_router(admin.router, prefix="/api")
    app.include_router(analysis.router, prefix="/api")
    app.include_router(avp.router, prefix="/api")
    if enable_runtime_control:
        app.include_router(runtime.router, prefix="/api")

    @app.get("/api/health", response_model=HealthResponse)
    def health() -> HealthResponse:
        """ヘルスチェック。DB ファイルの存在を read-only で返す。"""
        return HealthResponse(status="ok", db_exists=app_service.check_database_exists())

    return app


app = create_app()
