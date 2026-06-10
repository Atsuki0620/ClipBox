"""
Facade layer for UI.

Streamlit 側からの呼び出しをこのファイルに集約し、
副作用やロジック実装は既存モジュールに委譲する。
外部挙動は一切変えない。
"""

from datetime import datetime
from typing import Optional, Dict, List
from pathlib import Path

from core import config_utils
from core import database
from core.file_ops import create_file_scanner
from core.database import init_database, check_database_exists, get_db_connection
from core import analysis_service
from core.video_manager import VideoManager
from core.models import Video, normalize_text
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


def get_videos(
    favorite_levels: Optional[List[int]] = None,
    storage_locations: Optional[List[str]] = None,
    keyword: Optional[str] = None,
    availability: Optional[str] = None,
    show_unavailable: bool = False,
    show_deleted: bool = False,
    needs_selection_filter: Optional[bool] = None,
    exclude_selection: bool = False,
    watch_later_filter: Optional[bool] = None,
) -> List[Video]:
    """フィルタ条件に合致する動画一覧を返す（VideoManager.get_videos 委譲）。"""
    return create_video_manager().get_videos(
        favorite_levels=favorite_levels,
        storage_locations=storage_locations,
        keyword=keyword,
        availability=availability,
        show_unavailable=show_unavailable,
        show_deleted=show_deleted,
        needs_selection_filter=needs_selection_filter,
        exclude_selection=exclude_selection,
        watch_later_filter=watch_later_filter,
    )


def get_videos_by_ids(video_ids: List[int]) -> List[Video]:
    """指定IDの動画を取得する（IDの順序を保つ。削除済みも含む）。"""
    return create_video_manager().get_videos_by_ids(video_ids)


def search_videos(keyword: str, storage_locations: Optional[List[str]] = None) -> List[Video]:
    """ファイル名でDB内動画を部分一致検索する（normalize_text による正規化一致）。"""
    videos = create_video_manager().get_videos(
        storage_locations=storage_locations,
        show_unavailable=True,
        show_deleted=False,
    )
    if keyword:
        kw_norm = normalize_text(keyword)
        videos = [v for v in videos if kw_norm in normalize_text(v.essential_filename)]
    return videos


def get_unrated_random_videos(n: int) -> List[Video]:
    """未判定動画をランダムに n 本返す（ファイル存在チェック済み）。"""
    return create_video_manager().get_unrated_random_videos(n)


def get_unrated_fate_video() -> Optional[Video]:
    """未判定動画を純ランダムに1本返す。"""
    return create_video_manager().get_unrated_fate_video()


def get_fate_video(folder_path_str: str = "") -> Optional[Video]:
    """未選別動画から経過日数重み付けで1本返す（セレクション運命の1本）。"""
    return create_video_manager().get_fate_video(folder_path_str)


def play_video(video_id: int, **kwargs) -> Dict[str, str]:
    """動画を再生し視聴履歴を記録する（VideoManager.play_video 委譲）。"""
    return create_video_manager().play_video(video_id, **kwargs)


def toggle_watch_later(video_id: int) -> bool:
    """watch_later フラグを反転して新しい値を返す（VideoManager 委譲）。"""
    return create_video_manager().toggle_watch_later(video_id)


def record_avp_viewing(video_ids: List[int]) -> None:
    """AVP 再生後に viewing_history を一括記録する（1 トランザクション・executemany）。"""
    if not video_ids:
        return
    viewed_at = datetime.now()
    with get_db_connection() as conn:
        conn.executemany(
            "INSERT INTO viewing_history (video_id, viewed_at, viewing_method)"
            " VALUES (?, ?, 'APP_PLAYBACK')",
            [(vid, viewed_at) for vid in video_ids],
        )


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


def _get_existing_selection_folder(config: Dict[str, object]) -> Optional[Path]:
    selection_folder = str(config.get("selection_folder") or "").strip()
    if not selection_folder:
        return None

    path = Path(selection_folder)
    return path if path.exists() and path.is_dir() else None


def scan_and_update_with_connection(scanner) -> None:
    """DB 接続を内部で確立してスキャンを実行する。接続を外部から渡さない場合に使用。"""
    with get_db_connection() as conn:
        scanner.scan_and_update(conn)


def scan_library() -> Dict[str, str]:
    """保存済み config の library_roots からスキャナを構築しライブラリ全体を更新する。

    HTTP からは scanner オブジェクトを渡せないためサーバ側で構築する。config の roots は
    文字列で来るため Path へ変換する（FileScanner.scan_and_update が directory.exists() を呼ぶため）。
    結果は {'status', 'message'} で合成して返す。
    """
    try:
        config = config_utils.load_user_config()
        roots = [Path(r) for r in config.get("library_roots", [])]
        selection_folder = _get_existing_selection_folder(config)
        protected_roots = [selection_folder] if selection_folder else []
        scanner = create_file_scanner(roots, protected_roots=protected_roots)
        scan_and_update_with_connection(scanner)
        if selection_folder:
            selection_service.scan_selection_folder(selection_folder)
        return {"status": "success", "message": "ライブラリスキャンが完了しました"}
    except Exception as e:
        return {"status": "error", "message": f"スキャンに失敗しました: {e}"}


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
get_viewing_trend = analysis_service.get_viewing_trend
get_judgment_trend = analysis_service.get_judgment_trend
get_response_time_data = analysis_service.get_response_time_data
get_ranked_videos_for_tab = analysis_service.get_ranked_videos_for_tab

# いいね機能 -------------------------------------------------------------
add_like = like_service.add_like
get_like_counts = like_service.get_like_counts

# セレクション ----------------------------------------------------------
scan_selection_folder = selection_service.scan_selection_folder
get_selection_kpi = selection_service.get_selection_kpi


# DB 集計・選択肢・バックアップ（API 用 read wrapper） ----------------------
def get_kpi_stats() -> Dict[str, float]:
    """Tier1 KPI を返す（analysis_service.get_kpi_stats 委譲、接続は内部で確立）。"""
    with get_db_connection() as conn:
        return analysis_service.get_kpi_stats(conn)


def get_view_counts_map() -> Dict[int, int]:
    """動画IDごとの視聴回数マップを返す。"""
    with get_db_connection() as conn:
        return database.get_view_counts_map(conn)


def get_last_viewed_map() -> Dict[int, str]:
    """動画IDごとの最終視聴日時マップを返す。"""
    with get_db_connection() as conn:
        return database.get_last_viewed_map(conn)


def get_latest_judged_at_map(selection: bool) -> Dict[int, str]:
    """動画IDごとの最新判定日時マップを Tier 別に返す（判定日時ソート用）。"""
    with get_db_connection() as conn:
        return database.get_latest_judged_at_map(conn, selection)


def get_filter_options() -> Dict[str, list]:
    """フィルタUI用の選択肢（お気に入りレベル・保存場所）を返す。

    performers（フォルダ名由来の暫定抽出）はフィルタに用いないため返さない。
    """
    with get_db_connection() as conn:
        return {
            "favorite_levels": database.get_distinct_favorite_levels(conn),
            "storage_locations": database.get_distinct_storage_locations(conn),
        }


create_backup = database.create_backup


def has_recent_backup(hours: int = 24) -> bool:
    """BACKUP_DIR に mtime が直近 `hours` 時間以内の .db バックアップが存在するか。

    ライブラリスキャン（破壊的）前提条件の判定に使う。startup_backup が起動時に当日分を作るため
    通常運用では満たされる。
    """
    import time
    import config

    backup_dir = Path(config.BACKUP_DIR)
    if not backup_dir.exists():
        return False
    threshold = time.time() - hours * 3600
    for path in backup_dir.glob("*.db"):
        try:
            if path.stat().st_mtime >= threshold:
                return True
        except OSError:
            continue
    return False


# マイグレーション ----------------------------------------------------------
def run_startup_migration() -> dict:
    """
    起動時データマイグレーションを実行する（UI層からの直接DB接続を排除するため）。

    実行するデータ補正（いずれも冪等・ログ式で1回限り）:
      1. migrate_level_0_to_minus_1 … プレフィックスなしLv0 → -1（未判定）
      2. resync_selection_completed … is_selection_completed 列を + プレフィックスに再同期（R6）

    Returns:
        dict: {'status': str, 'message': str, 'updated_count': int, 'results': list[dict]}
    """
    from config import DATABASE_PATH
    from core.migration import Migration

    migration = Migration(DATABASE_PATH)
    with get_db_connection() as conn:
        results = [
            migration.migrate_level_0_to_minus_1(conn),
            migration.resync_selection_completed(conn),
        ]

    total_updated = sum(r.get("updated_count", 0) for r in results)
    status = "completed" if any(r.get("status") == "completed" for r in results) else "skipped"
    return {
        "status": status,
        "message": " / ".join(r.get("message", "") for r in results),
        "updated_count": total_updated,
        "results": results,
    }
