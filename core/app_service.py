"""
Facade layer for UI.

Streamlit 側からの呼び出しをこのファイルに集約し、
副作用やロジック実装は既存モジュールに委譲する。
外部挙動は一切変えない。
"""

from typing import Iterable, List, Optional, Dict
from pathlib import Path
from datetime import datetime

from core import database, snapshot, counter_service
from core import config_utils
from core.file_ops import create_file_scanner, detect_recently_accessed_files
from core.database import init_database, check_database_exists, get_db_connection
from core.settings import get_last_access_check_time, update_last_access_check_time
from core import analysis_service
from core.video_manager import VideoManager
from core import like_service
from core import selection_service


# DB / 接続管理 -------------------------------------------------------------
init_database = init_database
check_database_exists = check_database_exists
get_db_connection = get_db_connection


# VideoManager -------------------------------------------------------------
def create_video_manager() -> VideoManager:
    return VideoManager()


def record_file_access_as_viewing(video_manager: VideoManager, accessed_files: Iterable[dict]) -> int:
    return video_manager.record_file_access_as_viewing(accessed_files)


def set_favorite_level_with_rename(video_id: int, new_level: Optional[int]) -> Dict[str, str]:
    """VideoManager経由でお気に入りレベルを変更しリネームする"""
    video_manager = create_video_manager()
    return video_manager.set_favorite_level_with_rename(video_id, new_level)


def detect_library_root(file_path: Path, active_roots: list) -> str:
    """SCAN_DIRECTORIESのどれに属するかを判定"""
    for root in active_roots:
        root_path = Path(root)
        try:
            Path(file_path).resolve().relative_to(root_path.resolve())
            return str(root_path)
        except ValueError:
            continue
    return ""


# ファイルスキャン / アクセス検知 ------------------------------------------
create_file_scanner = create_file_scanner
detect_recently_accessed_files = detect_recently_accessed_files


def scan_and_update(scanner, conn) -> None:
    scanner.scan_and_update(conn)

def scan_and_update_with_connection(scanner) -> None:
    """DB?????????????????"""
    with get_db_connection() as conn:
        scanner.scan_and_update(conn)


def detect_recently_accessed_files_with_connection(last_check_time):
    """DB????????????????????"""
    with get_db_connection() as conn:
        return detect_recently_accessed_files(last_check_time, conn)


# アクセスチェック時刻 ------------------------------------------------------
get_last_access_check_time = get_last_access_check_time
update_last_access_check_time = update_last_access_check_time


# 設定 ----------------------------------------------------------------------
load_user_config = config_utils.load_user_config
save_user_config = config_utils.save_user_config


# 再生履歴 ------------------------------------------------------------------
def insert_play_history(*, file_path: str, title: str, player: str, library_root: str,
                        trigger: str, video_id: Optional[int] = None, internal_id: Optional[str] = None,
                        conn=None) -> None:
    database.insert_play_history(
        file_path=file_path,
        title=title,
        player=player,
        library_root=library_root,
        trigger=trigger,
        video_id=video_id,
        internal_id=internal_id,
        conn=conn,
    )


# スナップショット ----------------------------------------------------------
list_snapshots = snapshot.list_snapshots
create_snapshot = snapshot.create_snapshot
compare_snapshots = snapshot.compare_snapshots


# カウンター ----------------------------------------------------------------
get_counters_with_counts = counter_service.get_counters_with_counts
reset_counter = counter_service.reset_counter

# 分析タブ ---------------------------------------------------------------
load_analysis_data = analysis_service.load_analysis_data
apply_scope_filter = analysis_service.apply_scope_filter
convert_period_filter = analysis_service.convert_period_filter
calculate_period_view_count = analysis_service.calculate_period_view_count
get_viewing_history = analysis_service.get_viewing_history
get_judgment_history = analysis_service.get_judgment_history
get_view_count_ranking = analysis_service.get_view_count_ranking
get_view_days_ranking = analysis_service.get_view_days_ranking
get_like_count_ranking = analysis_service.get_like_count_ranking
get_selection_judgment_trend = analysis_service.get_selection_judgment_trend
get_selection_level_distribution = analysis_service.get_selection_level_distribution
get_response_time_data = analysis_service.get_response_time_data

# いいね機能 -------------------------------------------------------------
add_like = like_service.add_like
get_like_counts = like_service.get_like_counts

# セレクション ----------------------------------------------------------
scan_selection_folder = selection_service.scan_selection_folder
get_selection_kpi = selection_service.get_selection_kpi
