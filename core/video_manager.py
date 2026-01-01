"""
ClipBox - 動画管理ビジネスロジック
フィルタリング、再生、視聴履歴記録などの主要機能を提供
"""

import subprocess
import random
from typing import List, Optional, Dict
from datetime import datetime
from pathlib import Path

from core.models import Video
from core.database import get_db_connection


class VideoManager:
    """動画管理のビジネスロジック"""

    def get_videos(
        self,
        favorite_levels: Optional[List[int]] = None,
        performers: Optional[List[str]] = None,
        storage_locations: Optional[List[str]] = None
    ) -> List[Video]:
        """
        フィルタ条件に合致する動画を取得

        Args:
            favorite_levels: お気に入りレベルのリスト
            performers: 登場人物のリスト
            storage_locations: 保存場所のリスト

        Returns:
            List[Video]: 条件に合致する動画のリスト
        """
        with get_db_connection() as conn:
            query = "SELECT * FROM videos WHERE 1=1"
            params = []

            if favorite_levels:
                placeholders = ','.join('?' * len(favorite_levels))
                query += f" AND current_favorite_level IN ({placeholders})"
                params.extend(favorite_levels)

            if performers:
                placeholders = ','.join('?' * len(performers))
                query += f" AND performer IN ({placeholders})"
                params.extend(performers)

            if storage_locations:
                placeholders = ','.join('?' * len(storage_locations))
                query += f" AND storage_location IN ({placeholders})"
                params.extend(storage_locations)

            cursor = conn.execute(query, params)
            rows = cursor.fetchall()

            return [self._row_to_video(row) for row in rows]

    def get_random_video(
        self,
        favorite_levels: Optional[List[int]] = None,
        performers: Optional[List[str]] = None
    ) -> Optional[Video]:
        """
        ランダムに1本選択

        Args:
            favorite_levels: お気に入りレベルのリスト
            performers: 登場人物のリスト

        Returns:
            Optional[Video]: ランダムに選択された動画、該当なしの場合None
        """
        videos = self.get_videos(favorite_levels, performers)

        if not videos:
            return None

        return random.choice(videos)

    def play_video(self, video_id: int) -> Dict[str, str]:
        """
        動画を再生し、視聴履歴を記録

        Args:
            video_id: 再生する動画のID

        Returns:
            Dict: 実行結果 {'status': 'success'|'error', 'message': '...'}
        """
        with get_db_connection() as conn:
            cursor = conn.execute(
                "SELECT * FROM videos WHERE id = ?",
                (video_id,)
            )
            row = cursor.fetchone()

            if not row:
                return {
                    'status': 'error',
                    'message': '動画が見つかりません'
                }

            file_path = Path(row['current_full_path'])

            if not file_path.exists():
                return {
                    'status': 'error',
                    'message': 'ファイルが見つかりません。ファイルが移動または削除された可能性があります。'
                }

            # デフォルトプレイヤーで再生
            try:
                subprocess.Popen(['start', '', str(file_path)], shell=True)
            except Exception as e:
                return {
                    'status': 'error',
                    'message': f'再生に失敗しました: {str(e)}'
                }

            # 視聴履歴を記録
            conn.execute(
                """
                INSERT INTO viewing_history (video_id, viewed_at, viewing_method)
                VALUES (?, ?, 'APP_PLAYBACK')
                """,
                (video_id, datetime.now())
            )

            return {'status': 'success', 'message': '再生を開始しました'}

    def mark_as_viewed(self, video_id: int):
        """
        動画を視聴済みとして手動記録

        Args:
            video_id: 記録する動画のID
        """
        with get_db_connection() as conn:
            conn.execute(
                """
                INSERT INTO viewing_history (video_id, viewed_at, viewing_method)
                VALUES (?, ?, 'MANUAL_ENTRY')
                """,
                (video_id, datetime.now())
            )

    def get_viewing_stats(self) -> Dict:
        """
        視聴統計を取得

        Returns:
            Dict: 統計情報
        """
        with get_db_connection() as conn:
            # 視聴回数ランキング
            cursor = conn.execute("""
                SELECT v.id, v.essential_filename, COUNT(vh.id) as view_count
                FROM videos v
                LEFT JOIN viewing_history vh ON v.id = vh.video_id
                GROUP BY v.id
                ORDER BY view_count DESC
                LIMIT 20
            """)
            top_viewed = [dict(row) for row in cursor.fetchall()]

            # よく見るけど最近見ていない動画
            cursor = conn.execute("""
                SELECT v.id, v.essential_filename,
                       COUNT(vh.id) as view_count,
                       MAX(vh.viewed_at) as last_viewed
                FROM videos v
                LEFT JOIN viewing_history vh ON v.id = vh.video_id
                GROUP BY v.id
                HAVING view_count >= 5
                   AND (last_viewed IS NULL OR last_viewed < datetime('now', '-30 days'))
                ORDER BY view_count DESC
            """)
            forgotten_favorites = [dict(row) for row in cursor.fetchall()]

            return {
                'top_viewed': top_viewed,
                'forgotten_favorites': forgotten_favorites
            }

    def _row_to_video(self, row) -> Video:
        """
        データベースの行をVideoオブジェクトに変換

        Args:
            row: sqlite3.Row

        Returns:
            Video: 動画オブジェクト
        """
        return Video(
            id=row['id'],
            essential_filename=row['essential_filename'],
            current_full_path=row['current_full_path'],
            current_favorite_level=row['current_favorite_level'],
            file_size=row['file_size'],
            performer=row['performer'],
            storage_location=row['storage_location'],
            last_file_modified=row['last_file_modified'],
            created_at=row['created_at'],
            last_scanned_at=row['last_scanned_at'],
            notes=row['notes']
        )

    def record_file_access_as_viewing(self, accessed_files: List[dict]) -> int:
        """
        ファイルアクセスを視聴履歴として一括記録

        Args:
            accessed_files: アクセスされたファイルの情報リスト
                [{
                    'video_id': int,
                    'essential_filename': str,
                    'file_path': str,
                    'access_time': datetime
                }, ...]

        Returns:
            int: 記録した件数
        """
        if not accessed_files:
            return 0

        with get_db_connection() as conn:
            for file_info in accessed_files:
                conn.execute("""
                    INSERT INTO viewing_history (video_id, viewed_at, viewing_method)
                    VALUES (?, ?, 'FILE_ACCESS_DETECTED')
                """, (file_info['video_id'], file_info['access_time']))

            conn.commit()

        return len(accessed_files)
