"""
ClipBox - 未判定ランダムタブ
未判定（内部値 -1）の動画をランダム抽出して表示する。

【設計制約】
- core/ に import streamlit しない原則に従い、UI処理はこのモジュールに閉じる
- キャッシュ関数は ui/cache.py 経由で使用する

【依存関係】
- core/video_manager.py: get_unrated_random_videos / get_unrated_fate_video / get_videos_by_ids
- core/app_service.py: get_like_counts / add_like
- ui/cache.py: get_kpi_stats_cached / get_view_counts_and_last_viewed
- ui/components/: render_video_card / render_display_settings
"""

from __future__ import annotations

import streamlit as st

from core import app_service
from ui import cache as ui_cache
from ui.components.display_settings import render_display_settings, DisplaySettings
from ui.components.video_card import render_video_card


def render_random_mode(on_play, on_judge):
    """ランダムモードの描画（グリッド表示）"""
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
        if st.button("🔄 シャッフル", width="stretch", key="unrated_shuffle_btn"):
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
                    show_avp_checkbox=True,
                    is_avp_checked=current_video.id in st.session_state.get("avp_selected_ids", set()),
                    on_play_callback=make_play_handler(current_video),
                    on_judge_callback=make_judge_handler(current_video),
                    on_like_callback=make_like_handler(current_video),
                    key_prefix="unrated",
                )


def render_unrated_fate_mode(on_play, on_judge, kpi_stats: dict):
    """運命の1本モードの描画。未判定動画から純粋ランダムで1本を選出・再生・判定する。"""
    vm = st.session_state.video_manager
    has_candidates = kpi_stats["unrated_count"] > 0

    _, btn_col, _ = st.columns([1, 2, 1])
    with btn_col:
        draw = st.button(
            "🎯 運命の1本を引く",
            width="stretch",
            disabled=not has_candidates,
            key="unrated_fate_draw",
        )

    if draw:
        video = vm.get_unrated_fate_video()
        if video:
            st.session_state.unrated_fate_video = video
            on_play(video, "unrated_fate")

    st.divider()

    fate_video = st.session_state.unrated_fate_video

    if fate_video is None:
        if has_candidates:
            st.info("ボタンを押して運命の1本を引いてください。")
        else:
            st.info("未判定動画がありません。")
        return

    # DB同期（判定・いいね反映）
    synced = vm.get_videos_by_ids([fate_video.id])
    if not synced:
        st.session_state.unrated_fate_video = None
        st.warning("選出した動画が見つかりません。再度引き直してください。")
        return
    fate_video = synced[0]
    st.session_state.unrated_fate_video = fate_video

    like_counts = app_service.get_like_counts([fate_video.id])
    view_counts, _ = ui_cache.get_view_counts_and_last_viewed()

    settings_fate = render_display_settings(key_prefix="unrated_fate_disp")
    settings_fate.num_columns = 1

    is_selected = bool(
        st.session_state.selected_video
        and st.session_state.selected_video.id == fate_video.id
    )

    def play_handler(_v):
        on_play(fate_video, "unrated_fate")

    def judge_handler(_v, level):
        on_judge(fate_video, level)

    def like_handler(_v):
        new_count = app_service.add_like(fate_video.id)
        like_counts[fate_video.id] = new_count
        st.rerun(scope="fragment")

    _, card_col, _ = st.columns([1, 4, 1])
    with card_col:
        render_video_card(
            video=fate_video,
            settings=settings_fate,
            view_count=view_counts.get(fate_video.id, 0),
            like_count=like_counts.get(fate_video.id, 0),
            last_modified=fate_video.last_file_modified,
            show_judgment_ui=True,
            is_selected=is_selected,
            show_avp_checkbox=True,
            is_avp_checked=fate_video.id in st.session_state.get("avp_selected_ids", set()),
            on_play_callback=play_handler,
            on_judge_callback=judge_handler,
            on_like_callback=like_handler,
            key_prefix="unrated_fate",
        )
