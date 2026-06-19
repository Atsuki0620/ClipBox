"""
ARCHIVED: VideoManager の無効化メソッド集

Phase 1 (2026-06-02) と Phase 1 追加整理 (2026-06-02) で
core/video_manager.py からコメントアウト退避したメソッドの参照用コピー。
いずれも self / get_db_connection 等に依存するため単体では実行できない（参照専用）。
DB カラム is_judging は保持。
"""

# ============================================================
# Phase 1（初回）: 判定中フラグ・手動視聴記録
# ============================================================

# --- set_judging_state（F4 判定中フラグ。is_judging バッジと共にアーカイブ） ---
#
#     def set_judging_state(self, video_id: int, is_judging: bool) -> dict:
#         try:
#             with get_db_connection() as conn:
#                 conn.execute(
#                     "UPDATE videos SET is_judging = ? WHERE id = ?",
#                     (1 if is_judging else 0, video_id)
#                 )
#             return {"status": "success", "message": "判定中フラグを更新しました"}
#         except Exception as e:
#             return {"status": "error", "message": str(e)}


# --- mark_as_viewed（手動視聴記録。呼び出し元なし） ---
#
#     def mark_as_viewed(self, video_id: int):
#         with get_db_connection() as conn:
#             now = datetime.now()
#             conn.execute(
#                 """
#                 INSERT INTO viewing_history (video_id, viewed_at, viewing_method)
#                 VALUES (?, ?, 'MANUAL_ENTRY')
#                 """,
#                 (video_id, now)
#             )
#             counter_service.auto_start_counters(now, conn)


# ============================================================
# Phase 1 追加整理: 未使用・重複・孤立メソッド
# ============================================================

# --- get_random_video（未使用。get_unrated_random_videos / get_fate_video に置換） ---
#
#     def get_random_video(self, favorite_levels=None, performers=None) -> Optional[Video]:
#         videos = self.get_videos(favorite_levels, performers)
#         if not videos:
#             return None
#         return random.choice(videos)


# --- get_viewing_stats（未使用。旧統計機能。視聴回数ランキング＋忘れられたお気に入り） ---
#
#     def get_viewing_stats(self) -> Dict:
#         with get_db_connection() as conn:
#             cursor = conn.execute("""
#                 SELECT v.id, v.essential_filename, COUNT(vh.id) as view_count
#                 FROM videos v
#                 LEFT JOIN viewing_history vh ON v.id = vh.video_id
#                 GROUP BY v.id
#                 ORDER BY view_count DESC
#             """)
#             top_viewed = [dict(row) for row in cursor.fetchall()]
#             cursor = conn.execute("""
#                 SELECT v.id, v.essential_filename,
#                        COUNT(vh.id) as view_count,
#                        MAX(vh.viewed_at) as last_viewed
#                 FROM videos v
#                 LEFT JOIN viewing_history vh ON v.id = vh.video_id
#                 GROUP BY v.id
#                 HAVING view_count >= 5
#                    AND (last_viewed IS NULL OR last_viewed < datetime('now', '-30 days'))
#                 ORDER BY view_count DESC
#             """)
#             forgotten_favorites = [dict(row) for row in cursor.fetchall()]
#             return {'top_viewed': top_viewed, 'forgotten_favorites': forgotten_favorites}


# --- get_videos_with_stats（未使用。視聴回数は ui/cache.py に一元化） ---
#
#     def get_videos_with_stats(self, favorite_levels=None, performers=None, storage_locations=None) -> List[dict]:
#         with get_db_connection() as conn:
#             query = """
#                 SELECT v.*,
#                        COUNT(vh.id) AS view_count,
#                        MAX(vh.viewed_at) AS last_viewed
#                   FROM videos v
#                   LEFT JOIN viewing_history vh ON v.id = vh.video_id
#                  WHERE 1=1
#             """
#             params = []
#             if favorite_levels:
#                 placeholders = ",".join("?" * len(favorite_levels))
#                 query += f" AND v.current_favorite_level IN ({placeholders})"
#                 params.extend(favorite_levels)
#             if performers:
#                 placeholders = ",".join("?" * len(performers))
#                 query += f" AND v.performer IN ({placeholders})"
#                 params.extend(performers)
#             if storage_locations:
#                 placeholders = ",".join("?" * len(storage_locations))
#                 query += f" AND v.storage_location IN ({placeholders})"
#                 params.extend(storage_locations)
#             query += " GROUP BY v.id"
#             cursor = conn.execute(query, params)
#             rows = cursor.fetchall()
#             return [dict(row) for row in rows]


# --- set_favorite_level（set_favorite_level_with_rename の重複・未使用） ---
#
#     def set_favorite_level(self, video_id: int, new_level: int) -> Dict[str, str]:
#         if new_level < 0 or new_level > 4:
#             return {'status': 'error', 'message': 'レベルは0〜4で指定してください'}
#         with get_db_connection() as conn:
#             row = conn.execute("SELECT * FROM videos WHERE id = ?", (video_id,)).fetchone()
#             if not row:
#                 return {'status': 'error', 'message': '動画が見つかりません'}
#             essential = row["essential_filename"]
#             current_path = Path(row["current_full_path"])
#             if not current_path.exists():
#                 conn.execute("UPDATE videos SET is_available = 0 WHERE id = ?", (video_id,))
#                 return {'status': 'error', 'message': 'ファイルが見つかりません。移動・削除された可能性があります'}
#             prefix = "#" * new_level if new_level > 0 else ""
#             new_name = f"{prefix}_{essential}"
#             new_path = current_path.with_name(new_name)
#             try:
#                 if new_path != current_path:
#                     current_path.rename(new_path)
#             except FileNotFoundError:
#                 return {'status': 'error', 'message': 'ファイルが見つかりません'}
#             except PermissionError:
#                 return {'status': 'error', 'message': 'ファイルが使用中、またはアクセス権がありません'}
#             except Exception as e:
#                 return {'status': 'error', 'message': f'リネームに失敗しました: {e}'}
#             conn.execute(
#                 """
#                 UPDATE videos
#                    SET current_full_path = ?, current_favorite_level = ?, last_scanned_at = CURRENT_TIMESTAMP
#                  WHERE id = ?
#                 """,
#                 (str(new_path), new_level, video_id),
#             )
#             return {'status': 'success', 'message': f'レベル{new_level}に更新しました'}


# --- record_file_access_as_viewing（ファイルアクセス検知の退避により孤立） ---
#
#     def record_file_access_as_viewing(self, accessed_files: List[dict]) -> int:
#         if not accessed_files:
#             return 0
#         with get_db_connection() as conn:
#             for file_info in accessed_files:
#                 conn.execute("""
#                     INSERT INTO viewing_history (video_id, viewed_at, viewing_method)
#                     VALUES (?, ?, 'FILE_ACCESS_DETECTED')
#                 """, (file_info['video_id'], file_info['access_time']))
#         return len(accessed_files)
