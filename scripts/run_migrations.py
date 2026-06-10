"""起動時スキーマ移行ランナー（Next.js スタック用・単独プロセス）。

【役割】
  FastAPI + Next.js 構成では Streamlit を起動しないため、従来 Streamlit 側が担っていた
  init_database()（スキーマ ALTER）・run_startup_migration()（データ補正）を流す経路が無い。
  本スクリプトを起動バッチが uvicorn 起動の「前」に実行することで、新フロント/新コードが
  前提とする列（watch_later 等）を確実に用意する。

【設計制約】
  - streamlit を import しない（core.app_service / core.database 経由のみ）。
  - DB アクセスは get_db_connection() 経由（直接 sqlite3.connect 禁止）。
  - 同時書き込み防止（R3/R7）: API 稼働中（GET /api/health に応答）は書き込み移行を行わない。
    必要列が揃っていれば exit 0（安全に続行）、未充足なら exit!=0 で「API を停止して再実行」を促す。
  - バックアップは起動バッチ（startup_backup.py）が本スクリプトの前に生成する。本スクリプトは
    backup を呼ばない（直前の復元点が必ず存在する前提）。

【依存関係】
  config → core.database → core.app_service
"""

from __future__ import annotations

import sys
import urllib.error
import urllib.request
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

HEALTH_URL = "http://127.0.0.1:8000/api/health"
HEALTH_TIMEOUT_SEC = 2

# 新フロント/新コードが前提とする videos 列（不足していたら書き込み移行が必要）
REQUIRED_VIDEO_COLUMNS = ("watch_later", "is_selection_completed", "needs_selection")


def _api_is_up() -> bool:
    """GET /api/health に応答が返れば API 稼働中とみなす。

    接続拒否・タイムアウトのみ「未稼働」と判定する。4xx/5xx でもサーバは応答している
    （= プロセスが DB を掴んでいる）ため稼働中扱いとし、書き込みを避ける。
    """
    try:
        with urllib.request.urlopen(HEALTH_URL, timeout=HEALTH_TIMEOUT_SEC):
            return True
    except urllib.error.HTTPError:
        return True
    except urllib.error.URLError:
        return False
    except Exception:
        return False


def _missing_required_columns() -> list[str]:
    """videos テーブルに不足している必須列を返す（read-only）。"""
    from core.database import get_db_connection

    with get_db_connection() as conn:
        cols = {row[1] for row in conn.execute("PRAGMA table_info(videos)").fetchall()}
    return [c for c in REQUIRED_VIDEO_COLUMNS if c not in cols]


def _pending_data_migrations() -> list[str]:
    """未完了のデータ補正マイグレーションIDを返す（ledger を read-only で参照）。

    列が揃っていても ledger 未記録のデータ補正（resync_selection_completed 等）が残ると
    不整合データを抱えたまま起動が進むため、API 稼働中分岐でもこれを確認する。
    """
    from config import DATABASE_PATH
    from core.migration import Migration, DATA_MIGRATION_IDS

    migration = Migration(DATABASE_PATH)
    return [mid for mid in DATA_MIGRATION_IDS if not migration.is_migration_completed(mid)]


def _run_write_migrations() -> int:
    """スキーマ ALTER（init_database）+ データ補正（run_startup_migration）を実行する。"""
    from core import app_service

    app_service.init_database()
    result = app_service.run_startup_migration()
    print(
        "migrations applied: status={status} updated_count={updated_count}".format(
            status=result.get("status"),
            updated_count=result.get("updated_count"),
        )
    )
    return 0


def main() -> int:
    from core.database import check_database_exists

    if not check_database_exists():
        # DB がまだ無い → init_database が新規作成する（API 未稼働が前提）。
        if _api_is_up():
            print("ERROR: API is running but the database is missing. Stop the API and re-run.")
            return 1
        return _run_write_migrations()

    if _api_is_up():
        # API 稼働中は書き込みを避け、read-only でスキーマ列とデータ補正の完了を確認する（R7）。
        missing = _missing_required_columns()
        pending = _pending_data_migrations()
        if not missing and not pending:
            print("API is running; schema and data migrations already up to date. Skipping.")
            return 0
        reasons = []
        if missing:
            reasons.append("missing columns: " + ", ".join(missing))
        if pending:
            reasons.append("pending data migrations: " + ", ".join(pending))
        print(
            "ERROR: API is running and migrations are not complete "
            "({}). Stop the API and re-run this script.".format("; ".join(reasons))
        )
        return 1

    return _run_write_migrations()


if __name__ == "__main__":
    sys.exit(main())
