"""
ClipBox - データベース操作
SQLiteデータベースへのCRUD操作を提供
"""

import sqlite3
from contextlib import contextmanager

from config import DATABASE_PATH


@contextmanager
def get_db_connection():
    """
    データベース接続のコンテキストマネージャ

    Yields:
        sqlite3.Connection: データベース接続
    """
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row  # 辞書形式でアクセス可能
    # 外部キー制約を有効化（CASCADE を効かせる）
    conn.execute("PRAGMA foreign_keys = ON;")
    try:
        yield conn
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()


def init_database():
    """
    データベースの初期化
    テーブルとインデックスを作成
    """
    # データディレクトリが存在しない場合は作成
    DATABASE_PATH.parent.mkdir(parents=True, exist_ok=True)

    with get_db_connection() as conn:
        # videosテーブル作成
        conn.execute("""
            CREATE TABLE IF NOT EXISTS videos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                essential_filename TEXT NOT NULL UNIQUE,
                current_full_path TEXT NOT NULL,
                current_favorite_level INTEGER DEFAULT 0,
                file_size INTEGER,
                performer TEXT,
                storage_location TEXT,
                last_file_modified DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                last_scanned_at DATETIME,
                notes TEXT
            )
        """)

        # viewing_historyテーブル作成
        conn.execute("""
            CREATE TABLE IF NOT EXISTS viewing_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                video_id INTEGER NOT NULL,
                viewed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                viewing_method TEXT,
                FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE
            )
        """)

        # play_historyテーブル作成（再生イベントを直接記録）
        conn.execute("""
            CREATE TABLE IF NOT EXISTS play_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                video_id INTEGER,
                file_path TEXT NOT NULL,
                title TEXT NOT NULL,
                internal_id TEXT,
                player TEXT NOT NULL,
                library_root TEXT NOT NULL,
                trigger TEXT NOT NULL,
                played_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE
            )
        """)

        # 既存 play_history に video_id 列が無い場合はマイグレーション（簡易版）
        existing_cols = [row[1] for row in conn.execute("PRAGMA table_info(play_history)").fetchall()]
        if "video_id" not in existing_cols:
            conn.execute("ALTER TABLE play_history ADD COLUMN video_id INTEGER;")
            # 既存データには NULL のまま入る。新規挿入から video_id を設定する。
            conn.execute("CREATE INDEX IF NOT EXISTS idx_play_history_video_id ON play_history(video_id)")

        # 既存 videos テーブルに新規カラムを追加（マイグレーション）
        videos_cols = [row[1] for row in conn.execute("PRAGMA table_info(videos)").fetchall()]

        if "file_created_at" not in videos_cols:
            conn.execute("ALTER TABLE videos ADD COLUMN file_created_at DATETIME;")

        if "is_available" not in videos_cols:
            conn.execute("ALTER TABLE videos ADD COLUMN is_available BOOLEAN DEFAULT 1;")
            # 既存レコードにデフォルト値を設定
            conn.execute("UPDATE videos SET is_available = 1 WHERE is_available IS NULL;")

        if "is_deleted" not in videos_cols:
            conn.execute("ALTER TABLE videos ADD COLUMN is_deleted BOOLEAN DEFAULT 0;")
            # 既存レコードにデフォルト値を設定
            conn.execute("UPDATE videos SET is_deleted = 0 WHERE is_deleted IS NULL;")

        # インデックス作成
        conn.execute("CREATE INDEX IF NOT EXISTS idx_essential_filename ON videos(essential_filename)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_favorite_level ON videos(current_favorite_level)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_performer ON videos(performer)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_storage_location ON videos(storage_location)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_file_created_at ON videos(file_created_at)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_is_available ON videos(is_available)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_is_deleted ON videos(is_deleted)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_video_id ON viewing_history(video_id)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_viewed_at ON viewing_history(viewed_at)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_play_history_file_path ON play_history(file_path)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_play_history_played_at ON play_history(played_at)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_play_history_video_id ON play_history(video_id)")

        # counters テーブル（カウンタ A/B/C）
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS counters (
                counter_id TEXT PRIMARY KEY,
                start_time DATETIME
            )
            """
        )

        # 初期レコード投入（存在しないIDのみ）
        existing_ids = {row[0] for row in conn.execute("SELECT counter_id FROM counters").fetchall()}
        for cid in ["A", "B", "C"]:
            if cid not in existing_ids:
                conn.execute("INSERT INTO counters (counter_id, start_time) VALUES (?, NULL)", (cid,))

        conn.commit()


def check_database_exists() -> bool:
    """
    データベースファイルが存在するかチェック

    Returns:
        bool: 存在すればTrue
    """
    return DATABASE_PATH.exists()
