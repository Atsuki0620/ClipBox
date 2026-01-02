"""
play_history テーブルの基本的な挿入を確認するテスト
"""

from pathlib import Path
import tempfile

import pytest

from core import database
from core.database import init_database, get_db_connection
from core.history_repository import insert_play_history


def test_insert_play_history(monkeypatch):
    """play_history に1件挿入できることを確認"""
    with tempfile.TemporaryDirectory() as tmpdir:
        temp_db = Path(tmpdir) / "test_play_history.db"

        # DATABASE_PATH を一時DBに差し替え
        monkeypatch.setattr(database, "DATABASE_PATH", temp_db, raising=False)

        # スキーマを作成
        init_database()

        file_path = r"C:\videos\sample.mp4"
        title = "sample.mp4"
        player = "vlc"
        library_root = r"C:\videos"
        trigger = "row_button"
        internal_id = "abc123"

        # videos テーブルに対応レコードを作成（FK満たすため）
        with get_db_connection() as conn:
            conn.execute(
                """
                INSERT INTO videos (essential_filename, current_full_path, current_favorite_level)
                VALUES (?, ?, 0)
                """,
                (title, file_path),
            )
            video_id = conn.execute("SELECT id FROM videos").fetchone()["id"]

        insert_play_history(
            file_path=file_path,
            title=title,
            player=player,
            library_root=library_root,
            trigger=trigger,
            video_id=video_id,
            internal_id=internal_id,
        )

        with get_db_connection() as conn:
            rows = conn.execute("SELECT file_path, title, internal_id, player, library_root, trigger, video_id FROM play_history").fetchall()

        assert len(rows) == 1
        row = rows[0]
        assert row["file_path"] == file_path
        assert row["title"] == title
        assert row["internal_id"] == internal_id
        assert row["player"] == player
        assert row["library_root"] == library_root
        assert row["trigger"] == trigger
        assert row["video_id"] == 1
