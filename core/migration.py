"""
ClipBox - データベースマイグレーション管理
"""

from datetime import datetime
from pathlib import Path
import sqlite3


class Migration:
    """データベースマイグレーション管理クラス"""

    def __init__(self, db_path: Path):
        """
        Args:
            db_path: データベースファイルのパス
        """
        self.db_path = db_path
        self.migration_log_path = db_path.parent / "migration_history.txt"

    def is_migration_completed(self, migration_id: str) -> bool:
        """マイグレーションが完了済みか確認"""
        if not self.migration_log_path.exists():
            return False

        with open(self.migration_log_path, "r", encoding="utf-8") as log:
            return migration_id in log.read()

    def mark_migration_completed(self, migration_id: str) -> None:
        """マイグレーション完了をログに記録"""
        with open(self.migration_log_path, "a", encoding="utf-8") as log:
            log.write(f"{migration_id}\t{datetime.now().isoformat()}\n")

    def migrate_level_0_to_minus_1(self, conn: sqlite3.Connection) -> dict:
        """
        レベル0動画のうち、プレフィックスなしを-1に変更

        Args:
            conn: データベース接続
        Returns:
            dict: マイグレーション結果
        """
        migration_id = "migrate_level_0_to_minus_1_20260115"

        if self.is_migration_completed(migration_id):
            return {"status": "skipped", "message": "マイグレーションは既に完了しています", "updated_count": 0}

        cursor = conn.execute(
            """
            SELECT id, current_full_path, essential_filename
              FROM videos
             WHERE current_favorite_level = 0
            """
        )
        videos = cursor.fetchall()

        updated_count = 0
        for video_id, full_path, _ in videos:
            filename = Path(full_path).name

            # `_` や `#` で始まらない場合は未判定として -1 に変更
            if not filename.startswith("_") and not filename.startswith("#"):
                conn.execute(
                    """
                    UPDATE videos
                       SET current_favorite_level = -1
                     WHERE id = ?
                    """,
                    (video_id,),
                )
                updated_count += 1

        conn.commit()
        self.mark_migration_completed(migration_id)

        return {
            "status": "completed",
            "message": f"{updated_count} 件の動画をレベル0からレベル-1に変更しました",
            "updated_count": updated_count,
        }
