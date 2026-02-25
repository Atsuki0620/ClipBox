"""
ClipBox - 未判定ランダムタブ
レベル-1の動画をランダム抽出して表示する。
"""

from __future__ import annotations

import streamlit as st

from core import app_service
from ui import cache as ui_cache
from ui.components.kpi_display import render_kpi_cards
from ui.components.display_settings import render_display_settings, DisplaySettings
from ui.components.video_card import render_video_card


@st.fragment
def render_unrated_random_tab(on_play, on_judge):
    """未判定ランダムタブの描画"""
    st.header("🎲 未判定ランダム")

    # P1: キャッシュ版のKPI統計を使用
    kpi_stats = ui_cache.get_kpi_stats_cached()
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
        videos_sample = st.session_state.video_manager.get_unrated_random_videos(num_videos)
        st.session_state.unrated_videos = videos_sample
        st.session_state.unrated_sample_ids = [v.id for v in videos_sample]
        st.session_state.unrated_prev_token = shuffle_token
        st.session_state.unrated_prev_n = num_videos

    videos = st.session_state.get("unrated_videos", [])

    if not videos:
        st.info("未判定動画がありません。")
        return
    view_counts, _ = ui_cache.get_view_counts_and_last_viewed()

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
