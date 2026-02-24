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
from core import counter_service
from config import FAVORITE_LEVEL_NAMES


class VideoManager:
    """動画管理のビジネスロジック"""

    def get_videos(
        self,
        favorite_levels: Optional[List[int]] = None,
        performers: Optional[List[str]] = None,
        storage_locations: Optional[List[str]] = None,
        availability: Optional[str] = None,
        show_unavailable: bool = False,
        show_deleted: bool = False,
        show_judging_only: bool = False,
        needs_selection_filter: Optional[bool] = None,
    ) -> List[Video]:
        """
        ????????????????
        Args:
            favorite_levels: ????????????
            performers: ????????
            storage_locations: ????????
            availability: 'available' | 'unavailable' | 'all' | None?None ??????
            show_unavailable: ????????availability ? None ????????
            show_deleted: ?????????
            show_judging_only: 判定中動画のみ取得する場合はTrue
        """
        with get_db_connection() as conn:
            query = "SELECT * FROM videos WHERE 1=1"
            params: list = []

            # ??????????????
            if availability == "available":
                query += " AND is_available = 1"
            elif availability == "unavailable":
                query += " AND is_available = 0"
            else:
                if not show_unavailable:
                    query += " AND is_available = 1"

            if not show_deleted:
                query += " AND is_deleted = 0"
            if show_judging_only:
                query += " AND is_judging = 1"

            if needs_selection_filter is not None:
                query += " AND needs_selection = ?"
                params.append(1 if needs_selection_filter else 0)

            if favorite_levels:
                placeholders = ",".join("?" * len(favorite_levels))
                query += f" AND current_favorite_level IN ({placeholders})"
                params.extend(favorite_levels)

            if performers:
                placeholders = ",".join("?" * len(performers))
                query += f" AND performer IN ({placeholders})"
                params.extend(performers)

            if storage_locations:
                placeholders = ",".join("?" * len(storage_locations))
                query += f" AND storage_location IN ({placeholders})"
                params.extend(storage_locations)

            query += " ORDER BY current_favorite_level DESC, last_file_modified DESC"

            cursor = conn.execute(query, params)
            rows = cursor.fetchall()

            return [self._row_to_video(row) for row in rows]

    def get_videos_with_stats(
            self,
            favorite_levels: Optional[List[int]] = None,
            performers: Optional[List[str]] = None,
            storage_locations: Optional[List[str]] = None,
        ) -> List[dict]:
            """
            視聴回数・最終視聴日時を含めて取得（一覧詳細タブ向け）
            """
            with get_db_connection() as conn:
                query = """
                    SELECT v.*,
                           COUNT(vh.id) AS view_count,
                           MAX(vh.viewed_at) AS last_viewed
                      FROM videos v
                      LEFT JOIN viewing_history vh ON v.id = vh.video_id
                     WHERE 1=1
                """
                params = []

                if favorite_levels:
                    placeholders = ",".join("?" * len(favorite_levels))
                    query += f" AND v.current_favorite_level IN ({placeholders})"
                    params.extend(favorite_levels)

                if performers:
                    placeholders = ",".join("?" * len(performers))
                    query += f" AND v.performer IN ({placeholders})"
                    params.extend(performers)

                if storage_locations:
                    placeholders = ",".join("?" * len(storage_locations))
                    query += f" AND v.storage_location IN ({placeholders})"
                    params.extend(storage_locations)

                query += " GROUP BY v.id"

                cursor = conn.execute(query, params)
                rows = cursor.fetchall()
                return [dict(row) for row in rows]

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
                # ファイルが見つからない場合、is_available=0 に更新
                conn.execute(
                    "UPDATE videos SET is_available = 0 WHERE id = ?",
                    (video_id,)
                )
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

            viewed_at = datetime.now()
            # 視聴履歴を記録
            conn.execute(
                """
                INSERT INTO viewing_history (video_id, viewed_at, viewing_method)
                VALUES (?, ?, 'APP_PLAYBACK')
                """,
                (video_id, viewed_at)
            )
            # カウンタを初期化（未使用なら同時開始）
            counter_service.auto_start_counters(viewed_at)

            return {'status': 'success', 'message': '再生を開始しました'}

    def mark_as_viewed(self, video_id: int):
        """
        動画を視聴済みとして手動記録

        Args:
            video_id: 記録する動画のID
        """
        with get_db_connection() as conn:
            now = datetime.now()
            conn.execute(
                """
                INSERT INTO viewing_history (video_id, viewed_at, viewing_method)
                VALUES (?, ?, 'MANUAL_ENTRY')
                """,
                (video_id, now)
            )
            counter_service.auto_start_counters(now)

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
            notes=row['notes'],
            file_created_at=row['file_created_at'] if 'file_created_at' in row.keys() else None,
            is_available=bool(row['is_available']) if 'is_available' in row.keys() else True,
            is_deleted=bool(row['is_deleted']) if 'is_deleted' in row.keys() else False,
            is_judging=bool(row['is_judging']) if 'is_judging' in row.keys() else False,
            needs_selection=bool(row['needs_selection']) if 'needs_selection' in row.keys() else False,
        )

    def set_judging_state(self, video_id: int, is_judging: bool) -> dict:
        """
        F4: 判定中フラグを設定

        Args:
            video_id: 動画ID
            is_judging: True=判定中、False=判定完了

        Returns:
            dict: {"status": "success" or "error", "message": str}
        """
        try:
            with get_db_connection() as conn:
                conn.execute(
                    "UPDATE videos SET is_judging = ? WHERE id = ?",
                    (1 if is_judging else 0, video_id)
                )
            return {"status": "success", "message": "判定中フラグを更新しました"}
        except Exception as e:
            return {"status": "error", "message": str(e)}

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
                counter_service.auto_start_counters(file_info['access_time'])

            conn.commit()

        return len(accessed_files)

    def set_favorite_level_with_rename(self, video_id: int, new_level: Optional[int]) -> Dict[str, str]:
        """
        お気に入りレベルを変更し、ファイル名をリネームしてDBを更新する。

        Args:
            video_id: 対象動画のID
            new_level: None=未判定, 0=レベル0, 1-4=レベル1-4

        Returns:
            Dict: {'status': 'success'|'error', 'message': '...'}
        """
        judged_at = datetime.now()
        target_level = -1 if new_level is None else new_level

        with get_db_connection() as conn:
            row = conn.execute("SELECT * FROM videos WHERE id = ?", (video_id,)).fetchone()
            if not row:
                return {'status': 'error', 'message': '動画が見つかりません'}

            video = self._row_to_video(row)
            current_path = Path(video.current_full_path)

            if not current_path.exists():
                conn.execute("UPDATE videos SET is_available = 0 WHERE id = ?", (video_id,))
                return {'status': 'error', 'message': 'ファイルが見つかりません。移動または削除された可能性があります'}

            if target_level == -1:
                new_filename = video.essential_filename  # 未判定はプレフィックスなし
                db_level = -1
            elif target_level == 0:
                new_filename = f"_{video.essential_filename}"
                db_level = 0
            else:
                prefix = "#" * target_level
                new_filename = f"{prefix}_{video.essential_filename}"
                db_level = target_level

            # セレクション経由（! or + プレフィックス）の場合は + を付与
            was_selection = video.needs_selection  # ! prefix
            has_plus_prefix = current_path.name.startswith('+')  # + prefix（再判定時）
            if was_selection or has_plus_prefix:
                new_filename = f"+{new_filename}"

            new_path = current_path.with_name(new_filename)

            try:
                if new_path != current_path:
                    current_path.rename(new_path)

                conn.execute(
                    """
                    UPDATE videos
                       SET current_full_path = ?,
                           current_favorite_level = ?,
                           needs_selection = 0,
                           last_scanned_at = CURRENT_TIMESTAMP
                     WHERE id = ?
                    """,
                    (str(new_path), db_level, video_id),
                )

                rename_completed_at = datetime.now()
                rename_duration_ms = int((rename_completed_at - judged_at).total_seconds() * 1000)

                conn.execute(
                    """
                    INSERT INTO judgment_history (
                        video_id, old_level, new_level, judged_at,
                        rename_completed_at, rename_duration_ms, storage_location,
                        was_selection_judgment
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        video_id,
                        video.current_favorite_level,
                        db_level,
                        judged_at,
                        rename_completed_at,
                        rename_duration_ms,
                        video.storage_location,
                        1 if video.needs_selection else 0,
                    ),
                )

                level_name = FAVORITE_LEVEL_NAMES.get(db_level, f"レベル{db_level}")
                return {'status': 'success', 'message': f'判定完了: {level_name}'}

            except FileNotFoundError:
                return {'status': 'error', 'message': 'ファイルが見つかりません'}
            except PermissionError:
                return {'status': 'error', 'message': 'ファイルが使用中、またはアクセス権がありません'}
            except Exception as e:
                return {'status': 'error', 'message': f'リネームに失敗しました: {e}'}

    def set_favorite_level(self, video_id: int, new_level: int) -> Dict[str, str]:
        """
        お気に入りレベルを設定し、ファイル名をプレフィックス付きにリネームしてDBを更新する。
        Returns dict(status, message)
        """
        if new_level < 0 or new_level > 4:
            return {'status': 'error', 'message': 'レベルは0〜4で指定してください'}

        with get_db_connection() as conn:
            row = conn.execute("SELECT * FROM videos WHERE id = ?", (video_id,)).fetchone()
            if not row:
                return {'status': 'error', 'message': '動画が見つかりません'}

            essential = row["essential_filename"]
            current_path = Path(row["current_full_path"])
            if not current_path.exists():
                # ファイルが見つからない場合、is_available=0 に更新
                conn.execute(
                    "UPDATE videos SET is_available = 0 WHERE id = ?",
                    (video_id,)
                )
                return {'status': 'error', 'message': 'ファイルが見つかりません。移動・削除された可能性があります'}

            prefix = "#" * new_level if new_level > 0 else ""
            new_name = f"{prefix}_{essential}"
            new_path = current_path.with_name(new_name)

            try:
                if new_path != current_path:
                    current_path.rename(new_path)
            except FileNotFoundError:
                return {'status': 'error', 'message': 'ファイルが見つかりません'}
            except PermissionError:
                return {'status': 'error', 'message': 'ファイルが使用中、またはアクセス権がありません'}
            except Exception as e:
                return {'status': 'error', 'message': f'リネームに失敗しました: {e}'}

            conn.execute(
                """
                UPDATE videos
                   SET current_full_path = ?,
                       current_favorite_level = ?,
                       last_scanned_at = CURRENT_TIMESTAMP
                 WHERE id = ?
                """,
                (str(new_path), new_level, video_id),
            )

            return {'status': 'success', 'message': f'レベル{new_level}に更新しました'}

    def mark_as_deleted(self, video_id: int) -> Dict[str, str]:
        """
        動画を論理削除する（is_deleted=1に設定）

        Args:
            video_id: 削除する動画のID

        Returns:
            Dict: 実行結果 {'status': 'success'|'error', 'message': '...'}
        """
        with get_db_connection() as conn:
            row = conn.execute("SELECT * FROM videos WHERE id = ?", (video_id,)).fetchone()
            if not row:
                return {'status': 'error', 'message': '動画が見つかりません'}

            conn.execute(
                "UPDATE videos SET is_deleted = 1 WHERE id = ?",
                (video_id,)
            )

            return {'status': 'success', 'message': '削除済みに設定しました'}
