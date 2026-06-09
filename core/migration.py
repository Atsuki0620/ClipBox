"""
ClipBox - データベースマイグレーション管理
"""

from datetime import datetime
from pathlib import Path
import sqlite3


# データ補正マイグレーションID（単一の真実源）。
# run_startup_migration が適用する順に並べる。run_migrations.py は API 稼働中の
# read-only 判定で「未完了のデータ補正」が残っていないかをこのIDで確認する。
MIGRATE_LEVEL_0_TO_MINUS_1_ID = "migrate_level_0_to_minus_1_20260115"
RESYNC_SELECTION_COMPLETED_ID = "resync_selection_completed_20260609"
DATA_MIGRATION_IDS = (MIGRATE_LEVEL_0_TO_MINUS_1_ID, RESYNC_SELECTION_COMPLETED_ID)


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
        プレフィックスなしのLv0動画を -1（未判定）に変更する一回限りのマイグレーション。

        【背景】v2 でレベル体系を変更。プレフィックスなし → -1（未判定）、
               `_` プレフィックス → 0（Lv0）に意味を分離。
               migration_id で冪等性を保証（実行済みなら自動スキップ）。

        Args:
            conn: データベース接続
        Returns:
            dict: {"status": "success"|"skipped"|"error", "updated_count": int, "message": str}
        """
        migration_id = MIGRATE_LEVEL_0_TO_MINUS_1_ID

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
            "message": f"{updated_count} 件の動画をLv0から未判定に変更しました",
            "updated_count": updated_count,
        }

    def resync_selection_completed(self, conn: sqlite3.Connection) -> dict:
        """
        既存の全動画について is_selection_completed 列を + プレフィックス有無で再計算する。

        【背景】set_favorite_level_with_rename は + 付与時に列を更新していなかったため、
               列が既にあるDBでは過去に作られた + 動画の is_selection_completed が陳腐化している。
               init_database の + 走査は「列追加時のみ」実行されるため既存DBは是正されない。
               この一回限りのデータ補正で列を現実（current_full_path のベース名）に揃える。
               migration_id で冪等性を保証（実行済みなら自動スキップ）。

        Args:
            conn: データベース接続
        Returns:
            dict: {"status": "completed"|"skipped", "updated_count": int, "message": str}
        """
        migration_id = RESYNC_SELECTION_COMPLETED_ID

        if self.is_migration_completed(migration_id):
            return {"status": "skipped", "message": "選別済み列の再同期は既に完了しています", "updated_count": 0}

        rows = conn.execute(
            "SELECT id, current_full_path, is_selection_completed FROM videos"
        ).fetchall()

        updated_count = 0
        for row in rows:
            video_id, full_path, current_value = row[0], row[1], row[2]
            try:
                desired = 1 if Path(full_path).name.startswith("+") else 0
            except Exception:
                continue
            if (current_value or 0) != desired:
                conn.execute(
                    "UPDATE videos SET is_selection_completed = ? WHERE id = ?",
                    (desired, video_id),
                )
                updated_count += 1

        conn.commit()
        self.mark_migration_completed(migration_id)

        return {
            "status": "completed",
            "message": f"{updated_count} 件の is_selection_completed を + プレフィックスに再同期しました",
            "updated_count": updated_count,
        }
