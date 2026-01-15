from __future__ import annotations

from typing import List

import streamlit as st

from core import app_service
from core.database import get_db_connection
from core.models import normalize_text, create_sort_key
from config import FAVORITE_LEVEL_NAMES
from ui.components.display_settings import render_display_settings, DisplaySettings
from ui.components.kpi_display import render_kpi_cards, get_kpi_stats
from ui.components.video_card import render_video_card


SORT_OPTIONS: List[str] = [
    "お気に入り:高い順",
    "お気に入り:低い順",
    "視聴回数:多い順",
    "視聴回数:少ない順",
    "最終視聴:新しい順",
    "最終視聴:古い順",
    "ファイル作成:新しい順",
    "ファイル作成:古い順",
    "ファイル更新:新しい順",
    "ファイル更新:古い順",
    "タイトル:昇順",
    "タイトル:降順",
]


def _build_availability_filter() -> str | None:
    if st.session_state.filter_availability == ["AVAILABLE"]:
        return "available"
    if st.session_state.filter_availability == ["UNAVAILABLE"]:
        return "unavailable"
    return None


def _filter_by_keyword(videos, keyword: str):
    if not keyword:
        return videos
    key_norm = normalize_text(keyword)
    return [v for v in videos if key_norm in normalize_text(v.essential_filename)]


def render_library_tab(on_play, on_judge):
    """動画一覧タブを描画"""
    st.header("📚 動画一覧")

    with get_db_connection() as conn:
        kpi_stats = get_kpi_stats(conn)
    render_kpi_cards(
        unrated_count=kpi_stats["unrated_count"],
        judged_count=kpi_stats["judged_count"],
        judged_rate=kpi_stats["judged_rate"],
        today_judged_count=kpi_stats["today_judged_count"],
    )

    st.markdown("---")

    # 横並び配置：カラム数、未判定フィルタ、ソート、検索
    ctrl_col1, ctrl_col2, ctrl_col3, ctrl_col4 = st.columns([1.5, 1.5, 2, 2], gap="small")

    with ctrl_col1:
        col_count = st.radio(
            "カラム数",
            options=[3, 4, 5, 6],
            index=2,  # デフォルト5
            horizontal=True,
            key="library_col_count"
        )

    with ctrl_col2:
        unrated_filter = st.radio(
            "表示",
            options=["すべて表示", "未判定のみ"],
            index=0,
            horizontal=True,
            key="library_unrated_filter"
        )

    with ctrl_col3:
        sort_option = st.selectbox("ソート", options=SORT_OPTIONS, index=0, key="library_sort")

    with ctrl_col4:
        search_keyword = st.text_input(
            "タイトル検索",
            value=st.session_state.search_keyword,
            placeholder="タイトルの一部で検索...",
            key="library_search"
        )
        st.session_state.search_keyword = search_keyword

    settings: DisplaySettings = render_display_settings(key_prefix="library_disp")
    settings.num_columns = col_count

    vm = st.session_state.video_manager
    availability = _build_availability_filter()
    storage_values = None if "ALL" in st.session_state.filter_storage else st.session_state.filter_storage

    # 未判定フィルタの適用
    if unrated_filter == "未判定のみ":
        filter_levels = [-1]  # 未判定のみ
    else:
        filter_levels = st.session_state.filter_levels

    videos = vm.get_videos(
        favorite_levels=filter_levels,
        performers=st.session_state.filter_actors,
        storage_locations=storage_values,
        availability=availability,
        show_unavailable=True if availability is None else False,
        show_deleted=False,
    )

    videos = _filter_by_keyword(videos, search_keyword)

    if st.session_state.selected_video:
        st.caption(f"再生中: {st.session_state.selected_video.essential_filename}")

    view_counts, last_viewed_map = app_service.get_view_counts_and_last_viewed()

    if sort_option:
        videos = sorted(
            videos,
            key=lambda v: create_sort_key(v, sort_option, view_counts, last_viewed_map),
        )

    if not videos:
        st.info("条件に合う動画が見つかりません。フィルタや検索条件を確認してください。")
        return

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
                        on_play(vid, "row_button")
                    return handler

                def make_judge_handler(vid):
                    def handler(v, level):
                        on_judge(vid, level)
                    return handler

                render_video_card(
                    video=current_video,
                    settings=settings,
                    view_count=view_counts.get(current_video.id, 0),
                    last_modified=current_video.last_file_modified,
                    show_judgment_ui=True,
                    is_selected=is_selected,
                    on_play_callback=make_play_handler(current_video),
                    on_judge_callback=make_judge_handler(current_video),
                    key_prefix="library",
                )


def render_random_tab(on_play):
    """ランダム再生タブ"""
    st.subheader("🎲 ランダム再生")
    vm = st.session_state.video_manager

    favorite_levels = st.multiselect(
        "対象レベル",
        options=[4, 3, 2, 1, 0, -1],
        default=[4, 3, 2, 1, 0],
        format_func=lambda lv: FAVORITE_LEVEL_NAMES.get(lv, f"レベル{lv}"),
    )
    performers = st.multiselect(
        "登場人物",
        options=app_service.get_filter_options()[1],
        default=[],
        placeholder="名前で検索...",
    )

    if st.button("🎲 ランダム再生", use_container_width=True):
        video = vm.get_random_video(favorite_levels=favorite_levels, performers=performers)
        if video is None:
            st.warning("該当する動画がありません。フィルタを緩めてください。")
        else:
            st.success(f"選択: {video.essential_filename}")
            on_play(video, trigger="random_tab")
