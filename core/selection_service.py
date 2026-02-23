"""
ClipBox - セレクションサービス
セレクション（!プレフィックス付き未選別動画）固有のビジネスロジック。
UI非依存。
"""

from __future__ import annotations

from pathlib import Path
from typing import List, Optional

from core.database import get_db_connection
from core.scanner import FileScanner


def scan_selection_folder(folder_path: Path) -> dict:
    """
    指定フォルダをスキャンしてDBを更新する。

    Args:
        folder_path: スキャン対象フォルダ

    Returns:
        dict: {"status": "success"|"error", "message": str, "found_count": int}
    """
    if not folder_path.exists():
        return {"status": "error", "message": f"フォルダが見つかりません: {folder_path}", "found_count": 0}
    if not folder_path.is_dir():
        return {"status": "error", "message": f"フォルダではありません: {folder_path}", "found_count": 0}

    scanner = FileScanner([folder_path])
    try:
        with get_db_connection() as conn:
            # scan_and_update は「スキャン対象外のファイルを is_available=0 にする」副作用があるため使わない。
            # 指定フォルダのみをスキャンし、他ディレクトリのレコードには一切触れない。
            found_count = scanner.scan_single_directory(folder_path, conn)
        return {
            "status": "success",
            "message": f"スキャン完了: {found_count} 件のファイルを検出しました",
            "found_count": found_count,
        }
    except Exception as e:
        return {"status": "error", "message": f"スキャンエラー: {e}", "found_count": 0}


def get_selection_kpi(folder_path: Optional[str] = None) -> dict:
    """
    セレクション KPI を計算する。

    Args:
        folder_path: フォルダパスでスコープを絞る場合に指定（Noneなら全体）

    Returns:
        dict:
            unselected_count: 未選別数（needs_selection=1 AND is_available=1 AND is_deleted=0）
            judged_count: 選別済み動画数（was_selection_judgment=1 の DISTINCT video_id）
            judged_rate: 選別率 (%)
            today_judged_count: 本日の選別数
    """
    with get_db_connection() as conn:
        # 未選別数
        unselected_query = """
            SELECT COUNT(*)
              FROM videos
             WHERE needs_selection = 1
               AND is_available = 1
               AND is_deleted = 0
        """
        unselected_params: list = []
        if folder_path:
            unselected_query += " AND current_full_path LIKE ?"
            unselected_params.append(folder_path.rstrip("/\\") + "%")

        unselected_count = conn.execute(unselected_query, unselected_params).fetchone()[0]

        # 選別済み数（was_selection_judgment=1 の distinct video_id）
        judged_query = """
            SELECT COUNT(DISTINCT video_id)
              FROM judgment_history
             WHERE was_selection_judgment = 1
        """
        judged_params: list = []
        if folder_path:
            judged_query = """
                SELECT COUNT(DISTINCT jh.video_id)
                  FROM judgment_history jh
                  JOIN videos v ON v.id = jh.video_id
                 WHERE jh.was_selection_judgment = 1
                   AND v.current_full_path LIKE ?
            """
            judged_params.append(folder_path.rstrip("/\\") + "%")

        judged_count = conn.execute(judged_query, judged_params).fetchone()[0]

        total = unselected_count + judged_count
        judged_rate = (judged_count / total * 100) if total > 0 else 0.0

        # 本日の選別数
        today_query = """
            SELECT COUNT(DISTINCT video_id)
              FROM judgment_history
             WHERE was_selection_judgment = 1
               AND DATE(judged_at) = DATE('now', 'localtime')
        """
        today_judged_count = conn.execute(today_query).fetchone()[0]

    return {
        "unselected_count": int(unselected_count),
        "judged_count": int(judged_count),
        "judged_rate": float(judged_rate),
        "today_judged_count": int(today_judged_count),
    }
