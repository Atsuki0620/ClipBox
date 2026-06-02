"""
Facade layer for UI.

Streamlit 側からの呼び出しをこのファイルに集約し、
副作用やロジック実装は既存モジュールに委譲する。
外部挙動は一切変えない。
"""

from typing import Optional, Dict
from pathlib import Path

from core import config_utils
from core.file_ops import create_file_scanner
from core.database import init_database, check_database_exists, get_db_connection
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


# ファイルスキャン ----------------------------------------------------------
create_file_scanner = create_file_scanner


def scan_and_update_with_connection(scanner) -> None:
    """DB 接続を内部で確立してスキャンを実行する。接続を外部から渡さない場合に使用。"""
    with get_db_connection() as conn:
        scanner.scan_and_update(conn)


# 設定 ----------------------------------------------------------------------
load_user_config = config_utils.load_user_config
save_user_config = config_utils.save_user_config


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
get_ranked_videos_for_tab = analysis_service.get_ranked_videos_for_tab

# いいね機能 -------------------------------------------------------------
add_like = like_service.add_like
get_like_counts = like_service.get_like_counts

# セレクション ----------------------------------------------------------
scan_selection_folder = selection_service.scan_selection_folder
get_selection_kpi = selection_service.get_selection_kpi


# マイグレーション ----------------------------------------------------------
def run_startup_migration() -> dict:
    """
    起動時マイグレーションを実行する（UI層からの直接DB接続を排除するため）。

    Returns:
        dict: マイグレーション結果 {'status': str, 'message': str, 'updated_count': int}
    """
    from config import DATABASE_PATH
    from core.migration import Migration

    migration = Migration(DATABASE_PATH)
    with get_db_connection() as conn:
        return migration.migrate_level_0_to_minus_1(conn)
