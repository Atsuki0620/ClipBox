"""
ClipBox - 未判定ランダムタブ
レベル-1の動画をランダム抽出して表示する。
"""

from __future__ import annotations

import streamlit as st
from sqlite3 import Row
from typing import List

from core.database import get_db_connection
from core.models import Video
from core import app_service
from ui.components.kpi_display import render_kpi_cards
from ui.components.display_settings import render_display_settings, DisplaySettings
from ui.components.video_card import render_video_card


def _row_to_video(row: Row) -> Video:
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
    )


@st.fragment
def render_unrated_random_tab(on_play, on_judge):
    """未判定ランダムタブの描画"""
    st.header("🎲 未判定ランダム")

    # P1: キャッシュ版のKPI統計を使用
    kpi_stats = app_service.get_kpi_stats_cached()
    render_kpi_cards(
        unrated_count=kpi_stats["unrated_count"],
        judged_count=kpi_stats["judged_count"],
        judged_rate=kpi_stats["judged_rate"],
        today_judged_count=kpi_stats["today_judged_count"],
    )

    st.markdown("---")

    # 横並び配置：カラム数、表示件数、シャッフル
    ctrl_col1, ctrl_col2, ctrl_col3 = st.columns([2, 2, 1], gap="small")

    with ctrl_col1:
        col_count = st.radio(
            "カラム数",
            options=[3, 4, 5, 6],
            index=2,  # デフォルト5
            horizontal=True,
            key="unrated_col_count"
        )

    with ctrl_col2:
        num_videos = st.radio(
            "表示件数",
            options=[5, 10, 15, 20],
            index=1,  # デフォルト10
            horizontal=True,
            key="unrated_num_videos",
        )

    with ctrl_col3:
        if st.button("🔄 シャッフル", use_container_width=True, key="unrated_shuffle_btn"):
            st.session_state.unrated_shuffle_token = st.session_state.get("unrated_shuffle_token", 0) + 1
            st.rerun(scope="fragment")

    settings: DisplaySettings = render_display_settings(key_prefix="unrated_disp")
    settings.num_columns = col_count

    st.markdown("---")

    # シャッフル／件数変更トリガーを見てサンプルを決定
    shuffle_token = st.session_state.get("unrated_shuffle_token", 0)
    prev_token = st.session_state.get("unrated_prev_token")
    prev_n = st.session_state.get("unrated_prev_n")

    need_new_sample = (
        "unrated_sample_ids" not in st.session_state
        or shuffle_token != prev_token
        or num_videos != prev_n
    )

    if need_new_sample:
        with get_db_connection() as conn:
            ids = [
                row["id"]
                for row in conn.execute(
                    """
                    SELECT id
                      FROM videos
                     WHERE current_favorite_level = -1
                       AND is_available = 1
                       AND is_deleted = 0
                     ORDER BY RANDOM()
                     LIMIT ?
                    """,
                    (num_videos,),
                ).fetchall()
            ]
        st.session_state.unrated_sample_ids = ids
        st.session_state.unrated_prev_token = shuffle_token
        st.session_state.unrated_prev_n = num_videos

    sample_ids = st.session_state.get("unrated_sample_ids", [])

    if not sample_ids:
        st.info("未判定動画がありません。")
        return

    placeholder = ",".join(["?"] * len(sample_ids))
    order_case = " ".join([f"WHEN ? THEN {idx}" for idx in range(len(sample_ids))])
    with get_db_connection() as conn:
        rows: List[Row] = conn.execute(
            f"""
            SELECT *
              FROM videos
             WHERE id IN ({placeholder})
             ORDER BY CASE id {order_case} END
            """,
            tuple(sample_ids + sample_ids),
        ).fetchall()

    videos = [_row_to_video(row) for row in rows]
    view_counts, _ = app_service.get_view_counts_and_last_viewed()

    # いいね数を一括取得（N+1クエリ回避）
    video_ids = [v.id for v in videos]
    like_counts = app_service.get_like_counts(video_ids)

    col_count = max(1, min(6, settings.num_columns))

    # カードの上下揃えのため、行ごとにカラムを作成
    for row_start in range(0, len(videos), col_count):
        row_videos = videos[row_start:row_start + col_count]
        cols = st.columns(col_count, gap="small")

        for col_idx, video in enumerate(row_videos):
            with cols[col_idx]:
                is_selected = bool(st.session_state.selected_video and st.session_state.selected_video.id == video.id)

                # クロージャ問題を避けるため、ローカルスコープで変数をキャプチャ
                current_video = video

                def make_play_handler(vid):
                    def handler(v):
                        on_play(vid, "unrated_tab")
                    return handler

                def make_judge_handler(vid):
                    def handler(v, level):
                        on_judge(vid, level)
                    return handler

                def make_like_handler(vid):
                    def handler(v):
                        # いいねを追加して画面を更新
                        new_count = app_service.add_like(vid.id)
                        like_counts[vid.id] = new_count
                        st.rerun(scope="fragment")
                    return handler

                render_video_card(
                    video=current_video,
                    settings=settings,
                    view_count=view_counts.get(current_video.id, 0),
                    like_count=like_counts.get(current_video.id, 0),
                    last_modified=current_video.last_file_modified,
                    show_judgment_ui=True,
                    is_selected=is_selected,
                    on_play_callback=make_play_handler(current_video),
                    on_judge_callback=make_judge_handler(current_video),
                    on_like_callback=make_like_handler(current_video),
                    key_prefix="unrated",
                )
