"""
Snapshot utility.
現在のデータベース内容・設定・フィルタ状態などを別SQLiteに保存する。
"""

import json
import sqlite3
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, List

from core.database import get_db_connection
from config import PROJECT_ROOT


def _ensure_snapshot_dir() -> Path:
    path = PROJECT_ROOT / "data" / "snapshots"
    path.mkdir(parents=True, exist_ok=True)
    return path


def _timestamp_name() -> str:
    return datetime.now().strftime("%Y%m%d_%H%M")


def create_snapshot(filters: Dict[str, Any], user_config: Dict[str, Any]) -> Path:
    """
    現在のDBと設定のスナップショットを作成し、新しいSQLiteファイルを返す。
    Args:
        filters: 取得時点のフィルタ条件（dict）
        user_config: 現在のユーザー設定（dict）
    Returns:
        Path: 作成されたスナップショットDBファイルパス
    """
    snapshot_dir = _ensure_snapshot_dir()
    snapshot_path = snapshot_dir / f"{_timestamp_name()}.db"

    with get_db_connection() as src_conn, sqlite3.connect(snapshot_path) as dst:
        dst.execute("PRAGMA journal_mode=WAL;")

        # メタ情報テーブル
        dst.execute("""
            CREATE TABLE snapshot_meta (
                key TEXT PRIMARY KEY,
                value TEXT
            )
        """)

        # videos + view_count + last_viewed_at
        dst.execute("""
            CREATE TABLE videos (
                id INTEGER PRIMARY KEY,
                essential_filename TEXT,
                display_name TEXT,
                current_full_path TEXT,
                current_favorite_level INTEGER,
                file_size INTEGER,
                performer TEXT,
                storage_location TEXT,
                last_file_modified DATETIME,
                created_at DATETIME,
                last_scanned_at DATETIME,
                notes TEXT,
                view_count INTEGER,
                last_viewed_at DATETIME
            )
        """)

        dst.execute("""
            CREATE TABLE viewing_history_latest (
                id INTEGER,
                video_id INTEGER,
                viewed_at DATETIME,
                viewing_method TEXT
            )
        """)

        dst.execute("""
            CREATE TABLE play_history_latest (
                id INTEGER PRIMARY KEY,
                file_path TEXT,
                title TEXT,
                internal_id TEXT,
                player TEXT,
                library_root TEXT,
                trigger TEXT,
                played_at DATETIME
            )
        """)

        dst.execute("""
            CREATE TABLE ranking (
                rank INTEGER,
                video_id INTEGER,
                title TEXT,
                view_count INTEGER
            )
        """)

        dst.execute("""
            CREATE TABLE forgotten_favorites (
                video_id INTEGER,
                title TEXT,
                view_count INTEGER,
                last_viewed DATETIME
            )
        """)

        # メタ情報保存
        meta_items = {
            "created_at": datetime.now().isoformat(),
            "filters": json.dumps(filters, ensure_ascii=False),
            "user_config": json.dumps(user_config, ensure_ascii=False),
        }
        dst.executemany(
            "INSERT INTO snapshot_meta (key, value) VALUES (?, ?)",
            list(meta_items.items()),
        )

        # 動画 + 集計
        cursor = src_conn.execute("""
            SELECT v.*,
                   COUNT(vh.id) AS view_count,
                   MAX(vh.viewed_at) AS last_viewed_at
            FROM videos v
            LEFT JOIN viewing_history vh ON v.id = vh.video_id
            GROUP BY v.id
        """)
        rows = cursor.fetchall()
        dst.executemany("""
            INSERT INTO videos (
                id, essential_filename, display_name, current_full_path,
                current_favorite_level, file_size, performer, storage_location,
                last_file_modified, created_at, last_scanned_at, notes,
                view_count, last_viewed_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, [
            (
                r["id"],
                r["essential_filename"],
                _build_display_name(r["current_favorite_level"], r["essential_filename"]),
                r["current_full_path"],
                r["current_favorite_level"],
                r["file_size"],
                r["performer"],
                r["storage_location"],
                r["last_file_modified"],
                r["created_at"],
                r["last_scanned_at"],
                r["notes"],
                r["view_count"],
                r["last_viewed_at"],
            )
            for r in rows
        ])

        # viewing_history 最新100件
        vh_rows = src_conn.execute("""
            SELECT * FROM viewing_history
            ORDER BY viewed_at DESC
            LIMIT 100
        """).fetchall()
        dst.executemany("""
            INSERT INTO viewing_history_latest (id, video_id, viewed_at, viewing_method)
            VALUES (?, ?, ?, ?)
        """, [(r["id"], r["video_id"], r["viewed_at"], r["viewing_method"]) for r in vh_rows])

        # play_history 最新100件
        ph_rows = src_conn.execute("""
            SELECT * FROM play_history
            ORDER BY played_at DESC
            LIMIT 100
        """).fetchall()
        dst.executemany("""
            INSERT INTO play_history_latest
            (id, file_path, title, internal_id, player, library_root, trigger, played_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, [
            (
                r["id"],
                r["file_path"],
                r["title"],
                r["internal_id"],
                r["player"],
                r["library_root"],
                r["trigger"],
                r["played_at"],
            )
            for r in ph_rows
        ])

        # ランキング（全件）
        ranking_rows = src_conn.execute("""
            SELECT v.id, v.essential_filename, COUNT(vh.id) as view_count
            FROM videos v
            LEFT JOIN viewing_history vh ON v.id = vh.video_id
            GROUP BY v.id
            ORDER BY view_count DESC
        """).fetchall()
        dst.executemany("""
            INSERT INTO ranking (rank, video_id, title, view_count)
            VALUES (?, ?, ?, ?)
        """, [
            (idx + 1, r["id"], r["essential_filename"], r["view_count"])
            for idx, r in enumerate(ranking_rows)
        ])

        # 最近見ていないお気に入り
        forgotten_rows = src_conn.execute("""
            SELECT v.id, v.essential_filename,
                   COUNT(vh.id) as view_count,
                   MAX(vh.viewed_at) as last_viewed
            FROM videos v
            LEFT JOIN viewing_history vh ON v.id = vh.video_id
            GROUP BY v.id
            HAVING view_count >= 5
               AND (last_viewed IS NULL OR last_viewed < datetime('now', '-30 days'))
            ORDER BY view_count DESC
        """).fetchall()
        dst.executemany("""
            INSERT INTO forgotten_favorites (video_id, title, view_count, last_viewed)
            VALUES (?, ?, ?, ?)
        """, [
            (r["id"], r["essential_filename"], r["view_count"], r["last_viewed"])
            for r in forgotten_rows
        ])

        dst.commit()

    return snapshot_path


# ----- 読み込み・比較ユーティリティ -----

def list_snapshots() -> list:
    """スナップショット一覧（新しい順）"""
    snap_dir = _ensure_snapshot_dir()
    return sorted(snap_dir.glob("*.db"), reverse=True)


def load_summary(path: Path) -> Dict[str, Any]:
    """スナップショットDBから集計情報を読み込む"""
    with sqlite3.connect(path) as conn:
        conn.row_factory = sqlite3.Row
        total_videos = conn.execute("SELECT COUNT(*) FROM videos").fetchone()[0]
        total_views = conn.execute("SELECT COALESCE(SUM(view_count),0) FROM videos").fetchone()[0]
        meta_rows = conn.execute("SELECT key, value FROM snapshot_meta").fetchall()
        meta = {r["key"]: r["value"] for r in meta_rows}
        ranking = conn.execute(
            "SELECT video_id, title, view_count FROM ranking ORDER BY rank"
        ).fetchall()
        videos = conn.execute(
            "SELECT id, essential_filename, view_count FROM videos"
        ).fetchall()
        return {
            "path": str(path),
            "total_videos": total_videos,
            "total_views": total_views,
            "meta": meta,
            "ranking": [dict(r) for r in ranking],
            "videos": {r["id"]: dict(r) for r in videos},
        }


def compare_snapshots(old_path: Path, new_path: Path) -> Dict[str, Any]:
    """2つのスナップショットを比較し差分を返す"""
    old = load_summary(old_path)
    new = load_summary(new_path)

    total_videos_diff = new["total_videos"] - old["total_videos"]
    total_views_diff = new["total_views"] - old["total_views"]

    # 視聴回数の変化を抽出
    changed = []
    old_videos = old["videos"]
    new_videos = new["videos"]
    all_ids = set(old_videos.keys()) | set(new_videos.keys())
    for vid in all_ids:
        old_count = old_videos.get(vid, {}).get("view_count", 0)
        new_count = new_videos.get(vid, {}).get("view_count", 0)
        delta = new_count - old_count
        if delta != 0:
            title = new_videos.get(vid, old_videos.get(vid, {})).get("essential_filename", "")
            changed.append({"video_id": vid, "title": title, "old": old_count, "new": new_count, "delta": delta})

    changed_sorted = sorted(changed, key=lambda x: abs(x["delta"]), reverse=True)

    new_only = [
        {"video_id": vid, "title": info["essential_filename"], "view_count": info["view_count"]}
        for vid, info in new_videos.items() if vid not in old_videos
    ]
    missing = [
        {"video_id": vid, "title": info["essential_filename"], "view_count": info["view_count"]}
        for vid, info in old_videos.items() if vid not in new_videos
    ]

    return {
        "old": old,
        "new": new,
        "total_videos_diff": total_videos_diff,
        "total_views_diff": total_views_diff,
        "changed": changed_sorted,
        "new_only": new_only,
        "missing": missing,
    }


def _build_display_name(level: int, essential: str) -> str:
    prefix = "#" * level + "_" if level > 0 else "_"
    return f"{prefix}{essential}"
