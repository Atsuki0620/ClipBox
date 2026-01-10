"""
Facade layer for UI.

Streamlit 側からの呼び出しをこのファイルに集約し、
副作用やロジック実装は既存モジュールに委譲する。
外部挙動は一切変えない。
"""

from typing import Iterable, List, Optional

from datetime import datetime
from typing import Iterable, List, Optional

from core import database, snapshot, counter_service
from core import config_utils
from core.file_ops import create_file_scanner, detect_recently_accessed_files
from core.database import init_database, check_database_exists, get_db_connection
from core.settings import get_last_access_check_time, update_last_access_check_time
from core.video_manager import VideoManager


# DB / 接続管理 -------------------------------------------------------------
init_database = init_database
check_database_exists = check_database_exists
get_db_connection = get_db_connection


# VideoManager -------------------------------------------------------------
def create_video_manager() -> VideoManager:
    return VideoManager()


def record_file_access_as_viewing(video_manager: VideoManager, accessed_files: Iterable[dict]) -> int:
    return video_manager.record_file_access_as_viewing(accessed_files)


# ファイルスキャン / アクセス検知 ------------------------------------------
create_file_scanner = create_file_scanner
detect_recently_accessed_files = detect_recently_accessed_files


def scan_and_update(scanner, conn) -> None:
    scanner.scan_and_update(conn)


# アクセスチェック時刻 ------------------------------------------------------
get_last_access_check_time = get_last_access_check_time
update_last_access_check_time = update_last_access_check_time


# 設定 ----------------------------------------------------------------------
load_user_config = config_utils.load_user_config
save_user_config = config_utils.save_user_config


# 再生履歴 ------------------------------------------------------------------
def insert_play_history(*, file_path: str, title: str, player: str, library_root: str,
                        trigger: str, video_id: Optional[int] = None, internal_id: Optional[str] = None) -> None:
    database.insert_play_history(
        file_path=file_path,
        title=title,
        player=player,
        library_root=library_root,
        trigger=trigger,
        video_id=video_id,
        internal_id=internal_id,
    )


# スナップショット ----------------------------------------------------------
list_snapshots = snapshot.list_snapshots
create_snapshot = snapshot.create_snapshot
compare_snapshots = snapshot.compare_snapshots


# カウンター ----------------------------------------------------------------
get_counters_with_counts = counter_service.get_counters_with_counts
reset_counter = counter_service.reset_counter
