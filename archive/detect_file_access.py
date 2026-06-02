"""
ARCHIVED: ファイルアクセス検知機能（Phase 1 アーカイブ 2026-06-02）

Flask/Next.js 移行前整理として無効化。
元の実装は streamlit_app.py の detect_and_record_file_access() 関数。
"""

# from core import app_service
# from ui import cache as ui_cache
# import streamlit as st

# def detect_and_record_file_access():
#     """ファイルアクセスを検知して視聴履歴に記録"""
#     try:
#         last_check_time = app_service.get_last_access_check_time()
#         accessed_files = app_service.detect_recently_accessed_files_with_connection(last_check_time)
#         if accessed_files:
#             video_manager = app_service.create_video_manager()
#             recorded_count = app_service.record_file_access_as_viewing(video_manager, accessed_files)
#             file_details = []
#             for file_info in accessed_files:
#                 access_time_str = file_info['access_time'].strftime('%Y-%m-%d %H:%M:%S')
#                 file_details.append(f"- {file_info['essential_filename']} (アクセス日時: {access_time_str})")
#             details_text = "\n".join(file_details)
#             st.success(
#                 f"✅ {recorded_count} 件のファイルアクセスを検知し、視聴履歴に記録しました。\n\n"
#                 f"【記録されたファイル】\n{details_text}"
#             )
#         else:
#             if last_check_time:
#                 st.info(f"前回チェック ({last_check_time.strftime('%Y-%m-%d %H:%M:%S')}) 以降、新しいファイルアクセスは検知されませんでした。")
#             else:
#                 st.info("新しいファイルアクセスは検知されませんでした。")
#
#         app_service.update_last_access_check_time()
#         if accessed_files:
#             ui_cache.get_view_counts_and_last_viewed.clear()
#             ui_cache.get_metrics.clear()
#         return recorded_count if accessed_files else 0
#     except Exception as e:
#         st.error(f"ファイルアクセス検知エラー: {e}")
#         return 0
