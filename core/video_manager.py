"""
動画管理のビジネスロジック層。

【設計制約】
- streamlit を import しない（Flask移行時に再利用するため）
- DBアクセスは get_db_connection() 経由のみ（直接 sqlite3.connect 禁止）
- N+1クエリ禁止（ループ内でDB呼び出しをしない）

【依存関係】
models.py → database.py → video_manager.py → streamlit_app.py（UI）
"""

import subprocess
import random
from typing import List, Optional, Dict
from datetime import datetime
from pathlib import Path

from core.models import Video, is_path_within, normalize_text
from core.database import get_db_connection, insert_play_history
from core.logger import get_logger
from core.viewing import VIEWING_METHOD_APP_PLAYBACK
from config import FAVORITE_LEVEL_NAMES

logger = get_logger(__name__)

# SQLite のデフォルト SQLITE_MAX_VARIABLE_NUMBER は 999。チャンク単位をそれより小さく保つ。
_SQLITE_VAR_LIMIT = 900


def video_from_row(row) -> Video:
    """データベースの行を Video オブジェクトに変換（モジュールレベル公開関数）"""
    return Video(
        id=row["id"],
        essential_filename=row["essential_filename"],
        current_full_path=row["current_full_path"],
        current_favorite_level=row["current_favorite_level"],
        file_size=row["file_size"] if "file_size" in row.keys() else None,
        performer=row["performer"] if "performer" in row.keys() else None,
        storage_location=row["storage_location"] if "storage_location" in row.keys() else "",
        last_file_modified=row["last_file_modified"] if "last_file_modified" in row.keys() else None,
        created_at=row["created_at"] if "created_at" in row.keys() else None,
        last_scanned_at=row["last_scanned_at"] if "last_scanned_at" in row.keys() else None,
        notes=row["notes"] if "notes" in row.keys() else None,
        file_created_at=row["file_created_at"] if "file_created_at" in row.keys() else None,
        is_available=bool(row["is_available"]) if "is_available" in row.keys() else True,
        is_deleted=bool(row["is_deleted"]) if "is_deleted" in row.keys() else False,
        is_judging=bool(row["is_judging"]) if "is_judging" in row.keys() else False,
        needs_selection=bool(row["needs_selection"]) if "needs_selection" in row.keys() else False,
        watch_later=bool(row["watch_later"]) if "watch_later" in row.keys() else False,
    )


class VideoManager:
    """動画管理のビジネスロジック"""

    def get_videos(
        self,
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
        """
        フィルタ条件に合致する動画一覧を返す。

        Args:
            favorite_levels: 取得するお気に入りレベルのリスト（例: [3, 4]）。None で全レベル。
            storage_locations: ストレージ場所のリスト（'C_DRIVE', 'EXTERNAL_HDD'）。None で全ストレージ。
            availability: 'available'=利用可能のみ / 'unavailable'=利用不可のみ / None=show_unavailable に従う。
            show_unavailable: True のとき is_available=0 も含める（availability が None のときのみ有効）。
            show_deleted: True のとき is_deleted=1 も含める。通常は False。
            needs_selection_filter: True=!プレフィックス動画のみ / False=通常動画のみ / None=全て。
            exclude_selection: True のとき needs_selection=1 と is_selection_completed=1 の動画を除外する。
            watch_later_filter: True=あとで見る動画のみ / False=それ以外のみ / None=全て。

        Returns:
            List[Video]: 条件に合致する動画のリスト。
        """
        with get_db_connection() as conn:
            query = "SELECT * FROM videos WHERE 1=1"
            params: list = []

            # is_available / 表示可否フィルタ
            if availability == "available":
                query += " AND is_available = 1"
            elif availability == "unavailable":
                query += " AND is_available = 0"
            else:
                if not show_unavailable:
                    query += " AND is_available = 1"

            if not show_deleted:
                query += " AND is_deleted = 0"

            if needs_selection_filter is not None:
                query += " AND needs_selection = ?"
                params.append(1 if needs_selection_filter else 0)

            if exclude_selection:
                query += " AND needs_selection = 0 AND is_selection_completed = 0"

            if watch_later_filter is not None:
                query += " AND watch_later = ?"
                params.append(1 if watch_later_filter else 0)

            if favorite_levels:
                placeholders = ",".join("?" * len(favorite_levels))
                query += f" AND current_favorite_level IN ({placeholders})"
                params.extend(favorite_levels)

            if storage_locations:
                placeholders = ",".join("?" * len(storage_locations))
                query += f" AND storage_location IN ({placeholders})"
                params.extend(storage_locations)

            query += " ORDER BY current_favorite_level DESC, last_file_modified DESC"

            cursor = conn.execute(query, params)
            rows = cursor.fetchall()

            videos = [self._row_to_video(row) for row in rows]
            if keyword:
                keyword_norm = normalize_text(keyword)
                videos = [
                    video
                    for video in videos
                    if keyword_norm in normalize_text(video.essential_filename)
                ]
            return videos

    def get_videos_by_ids(
        self, video_ids: List[int], include_deleted: bool = False
    ) -> List[Video]:
        """指定IDリストの動画をDBから取得し、IDの順序を保って返す。

        重複IDは先頭の出現のみ返す（dedup 済み・入力順維持）。
        SQLite のバインド変数上限を超える件数は _SQLITE_VAR_LIMIT 件ずつチャンクに
        分けて取得し、最終的な順序を入力順に揃える。
        include_deleted=True の場合のみ is_deleted=1 の動画も返す。
        """
        if not video_ids:
            return []
        # 重複を除去しつつ挿入順を維持（dict.fromkeys は Python 3.7+ で挿入順保証）
        unique_ids = list(dict.fromkeys(video_ids))
        id_to_video: Dict[int, Video] = {}
        deleted_filter = "" if include_deleted else " AND is_deleted = 0"
        with get_db_connection() as conn:
            for i in range(0, len(unique_ids), _SQLITE_VAR_LIMIT):
                chunk = unique_ids[i : i + _SQLITE_VAR_LIMIT]
                placeholders = ",".join("?" * len(chunk))
                rows = conn.execute(
                    f"SELECT * FROM videos WHERE id IN ({placeholders}){deleted_filter}",
                    chunk,
                ).fetchall()
                for row in rows:
                    id_to_video[row["id"]] = video_from_row(row)
        return [id_to_video[vid] for vid in unique_ids if vid in id_to_video]

    def get_fate_video(self, folder_path_str: str = "") -> Optional[Video]:
        """未選別動画から純ランダムで1本選出する（旧呼び出し互換）。"""
        return self.get_selection_fate_video(folder_path_str)

    def get_selection_fate_video(
        self,
        folder_path_str: str = "",
        *,
        recently_unwatched_priority: bool = False,
    ) -> Optional[Video]:
        """未選別動画を1本選出する（Tier2 運命の1本用）。"""
        videos = self.get_videos(
            needs_selection_filter=True,
            show_unavailable=False,
            show_deleted=False,
        )
        if not videos:
            return None
        if folder_path_str:
            videos = [v for v in videos if is_path_within(v.current_full_path, folder_path_str)]
        if not videos:
            return None
        if not recently_unwatched_priority:
            return random.choice(videos)

        return self._choose_by_recently_unwatched_priority(videos)

    def _choose_by_recently_unwatched_priority(self, videos: List[Video]) -> Optional[Video]:
        """最終視聴日が古い/未再生の動画を軽く優先して1本選ぶ。"""
        video_ids = [v.id for v in videos if v.id is not None]
        if not video_ids:
            return None
        placeholders = ",".join("?" * len(video_ids))
        with get_db_connection() as conn:
            rows = conn.execute(
                f"SELECT video_id, MAX(viewed_at) AS last_viewed"
                f" FROM viewing_history WHERE viewing_method = ?"
                f" AND video_id IN ({placeholders})"
                f" GROUP BY video_id",
                [VIEWING_METHOD_APP_PLAYBACK, *video_ids],
            ).fetchall()
        last_viewed_map = {row["video_id"]: row["last_viewed"] for row in rows}

        today = datetime.now()
        weights: list[float] = []
        for v in videos:
            lv = last_viewed_map.get(v.id)
            weights.append(self._recently_unwatched_weight(lv, today))

        return random.choices(videos, weights=weights, k=1)[0]

    @staticmethod
    def _recently_unwatched_weight(last_viewed: Optional[str], now: datetime) -> float:
        """0..180日に丸めて weight=1+days/90 を返す。未再生/不正日は最大重み。"""
        days = 180
        if last_viewed:
            try:
                days = (now - datetime.fromisoformat(last_viewed.replace(" ", "T"))).days
            except ValueError:
                days = 180
        days = min(180, max(0, days))
        return 1 + days / 90

    def get_unrated_random_videos(self, n: int) -> List[Video]:
        """未判定（内部値 -1）の動画をランダムに n 件取得して返す。

        Tier1 は判定層のため、セレクション関連（needs_selection / is_selection_completed）は除外する。
        ランダム順序を保ったまま全フィールドの Video リストを返すため、
        UI 側は DB に直接アクセスする必要がない。
        ファイルが実際に存在しない動画（外付けHDD未接続など）は除外する。
        ドライブ単位の接続確認を 1 回のみ行い、未接続ドライブのファイルを高速スキップする。
        LIMIT を設けず全件をシャッフル取得することで、接続済みドライブの動画が少数でも確実に拾える。
        """
        with get_db_connection() as conn:
            rows = conn.execute(
                """
                SELECT * FROM videos
                WHERE current_favorite_level = -1
                  AND is_available = 1
                  AND is_deleted = 0
                  AND needs_selection = 0
                  AND is_selection_completed = 0
                ORDER BY RANDOM()
                """,
            ).fetchall()

        # ドライブ単位の存在確認を 1 回のみ実行（未接続ドライブのファイルを高速スキップ）
        drive_cache: dict = {}

        result = []
        for row in rows:
            video = video_from_row(row)
            path = Path(video.current_full_path)
            drive = path.drive  # "C:", "D:" など
            if drive not in drive_cache:
                drive_cache[drive] = Path(drive + "/").exists()
            if not drive_cache[drive]:
                continue
            if path.exists():
                result.append(video)
                if len(result) >= n:
                    break
        return result

    def get_unrated_fate_video(
        self,
        *,
        recently_unwatched_priority: bool = False,
    ) -> Optional[Video]:
        """未判定動画から1本選出する（Tier1 運命の1本用）。"""
        if not recently_unwatched_priority:
            videos = self.get_unrated_random_videos(1)
            return videos[0] if videos else None

        with get_db_connection() as conn:
            rows = conn.execute(
                """
                SELECT * FROM videos
                WHERE current_favorite_level = -1
                  AND is_available = 1
                  AND is_deleted = 0
                  AND needs_selection = 0
                  AND is_selection_completed = 0
                """
            ).fetchall()

        drive_cache: dict = {}
        videos = []
        for row in rows:
            video = video_from_row(row)
            path = Path(video.current_full_path)
            drive = path.drive
            if drive not in drive_cache:
                drive_cache[drive] = Path(drive + "/").exists()
            if drive_cache[drive] and path.exists():
                videos.append(video)

        return self._choose_by_recently_unwatched_priority(videos) if videos else None

    def play_video(
        self,
        video_id: int,
        *,
        player: Optional[str] = None,
        trigger: Optional[str] = None,
        library_root: Optional[str] = None,
        internal_id: Optional[str] = None,
    ) -> Dict[str, str]:
        """
        動画を再生し、viewing_history と play_history を同一トランザクションで記録する。

        Args:
            video_id: 再生する動画のID
            player: 使用するプレイヤー名（省略時は play_history を記録しない）
            trigger: 再生トリガー識別子
            library_root: ライブラリルートパス
            internal_id: ファイルの内部識別子

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
            # viewing_history と play_history を同一トランザクションで記録
            conn.execute(
                """
                INSERT INTO viewing_history (video_id, viewed_at, viewing_method)
                VALUES (?, ?, ?)
                """,
                (video_id, viewed_at, VIEWING_METHOD_APP_PLAYBACK)
            )
            if player is not None:
                insert_play_history(
                    file_path=str(file_path),
                    title=row["essential_filename"],
                    player=player,
                    library_root=library_root or "",
                    trigger=trigger or "",
                    video_id=video_id,
                    internal_id=internal_id,
                    conn=conn,
                )
            return {'status': 'success', 'message': '再生を開始しました'}

    def _row_to_video(self, row) -> Video:
        """データベースの行を Video オブジェクトに変換（モジュールレベル関数に委譲）"""
        return video_from_row(row)

    def set_favorite_level_with_rename(self, video_id: int, new_level: Optional[int]) -> Dict[str, str]:
        """
        お気に入りレベルを変更し、ファイル名をリネームしてDBを更新する。

        Args:
            video_id: 対象動画のID
            new_level: None=未判定, 0=Lv0, 1-4=Lv1-Lv4

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
                logger.warning(
                    "operation=judgment video_id=%d reason=file_not_found", video_id
                )
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

            # セレクション動画（! 未選別 or + 完了）の状態遷移:
            #   - level>=0 を付けたら「選別完了」= + プレフィックス（needs_selection=0, completed=1）。
            #   - 未判定(-1)へ戻したら「未選別」= ! プレフィックスへ差し戻す（needs_selection=1, completed=0）。
            #     ※ + のまま level だけ消す「+完了なのにレベル無し」(+name) の不正状態を作らない。
            # 通常動画は needs_selection / is_selection_completed とも 0 のまま。
            was_selection = video.needs_selection  # ! prefix
            has_plus_prefix = current_path.name.startswith('+')  # + prefix（再判定時）
            is_selection_video = was_selection or has_plus_prefix
            if is_selection_video and target_level == -1:
                new_filename = f"!{new_filename}"
                new_needs_selection = 1
                new_is_selection_completed = 0
            elif is_selection_video:
                new_filename = f"+{new_filename}"
                new_needs_selection = 0
                new_is_selection_completed = 1
            else:
                new_needs_selection = 0
                new_is_selection_completed = 0

            new_path = current_path.with_name(new_filename)

            # 判定済み(level>=0) もしくは 選別完了(+付与) になった動画は「あとで見る」を自動解除する。
            # 未選別(!)へ差し戻した場合は未完了のため解除しない。
            clear_watch_later = (db_level >= 0) or (new_is_selection_completed == 1)

            try:
                if new_path != current_path:
                    current_path.rename(new_path)

                conn.execute(
                    """
                    UPDATE videos
                       SET current_full_path = ?,
                           current_favorite_level = ?,
                           needs_selection = ?,
                           is_selection_completed = ?,
                           watch_later = CASE WHEN ? = 1 THEN 0 ELSE watch_later END,
                           last_scanned_at = CURRENT_TIMESTAMP
                     WHERE id = ?
                    """,
                    (
                        str(new_path),
                        db_level,
                        new_needs_selection,
                        new_is_selection_completed,
                        1 if clear_watch_later else 0,
                        video_id,
                    ),
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
                        1 if (video.needs_selection or video.is_selection_completed) else 0,
                    ),
                )

                logger.info(
                    "operation=judgment video_id=%d old_level=%d new_level=%d "
                    "rename=success elapsed_ms=%d storage=%s",
                    video_id,
                    video.current_favorite_level,
                    db_level,
                    rename_duration_ms,
                    video.storage_location or "unknown",
                )
                level_name = FAVORITE_LEVEL_NAMES.get(db_level, f"レベル{db_level}")
                return {'status': 'success', 'message': f'判定完了: {level_name}'}

            except FileNotFoundError:
                logger.warning(
                    "operation=judgment video_id=%d reason=file_not_found_on_rename", video_id
                )
                return {'status': 'error', 'message': 'ファイルが見つかりません'}
            except PermissionError:
                logger.warning(
                    "operation=judgment video_id=%d reason=permission_error", video_id
                )
                return {'status': 'error', 'message': 'ファイルが使用中、またはアクセス権がありません'}
            except Exception as e:
                logger.warning(
                    "operation=judgment video_id=%d reason=rename_error error=%s", video_id, str(e)
                )
                return {'status': 'error', 'message': f'リネームに失敗しました: {e}'}

    def unselect_video(self, video_id: int) -> Dict[str, str]:
        """Tier2: レベルを維持したまま needs_selection=1 に戻す（ファイル先頭に ! を付与）。"""
        with get_db_connection() as conn:
            row = conn.execute("SELECT * FROM videos WHERE id = ?", (video_id,)).fetchone()
            if not row:
                return {"status": "error", "message": "動画が見つかりません"}

            video = self._row_to_video(row)
            current_path = Path(video.current_full_path)
            if not current_path.exists():
                conn.execute("UPDATE videos SET is_available = 0 WHERE id = ?", (video_id,))
                logger.warning("operation=unselect video_id=%d reason=file_not_found", video_id)
                return {"status": "error", "message": "ファイルが見つかりません。移動または削除された可能性があります"}

            level = video.current_favorite_level
            if level <= -1:
                level_prefix = ""
            elif level == 0:
                level_prefix = "_"
            else:
                level_prefix = "#" * level + "_"

            new_filename = f"!{level_prefix}{video.essential_filename}"
            new_path = current_path.parent / new_filename

            try:
                if current_path != new_path:
                    current_path.rename(new_path)

                conn.execute(
                    "UPDATE videos SET current_full_path=?, needs_selection=1, "
                    "is_selection_completed=0, last_scanned_at=CURRENT_TIMESTAMP WHERE id=?",
                    (str(new_path), video_id),
                )
            except PermissionError:
                return {"status": "error", "message": "ファイルが使用中、またはアクセス権がありません"}
            except Exception as e:
                return {"status": "error", "message": f"リネームに失敗しました: {e}"}

        return {"status": "success", "message": "未選別に戻しました"}

    def toggle_watch_later(self, video_id: int) -> bool:
        """watch_later フラグを反転して新しい値を返す。動画不在は KeyError。"""
        with get_db_connection() as conn:
            rowcount = conn.execute(
                "UPDATE videos SET watch_later = 1 - watch_later WHERE id = ? AND is_deleted = 0",
                (video_id,),
            ).rowcount
            if rowcount == 0:
                raise KeyError(video_id)
            row = conn.execute(
                "SELECT watch_later FROM videos WHERE id = ?", (video_id,)
            ).fetchone()
        return bool(row["watch_later"])
