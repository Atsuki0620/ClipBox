from __future__ import annotations

from typing import List

import streamlit as st

from core import app_service
from core.models import normalize_text, create_sort_key
from config import FAVORITE_LEVEL_NAMES
from ui.components.display_settings import render_display_settings, DisplaySettings
from ui.components.kpi_display import render_kpi_cards
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


def _render_filter_controls():
    """動画一覧用フィルタをエクスパンダー内に表示"""
    _, performers, _ = app_service.get_filter_options()

    level_options = [4, 3, 2, 1, 0, -1]
    level_label_map = {lv: FAVORITE_LEVEL_NAMES.get(lv, f"レベル{lv}") for lv in level_options}

    storage_options = ["すべて表示", "Cドライブのみ", "外付けHDDのみ"]
    storage_map = {
        "すべて表示": "ALL",
        "Cドライブのみ": "C_DRIVE",
        "外付けHDDのみ": "EXTERNAL_HDD",
    }

    availability_options = ["利用可能のみ", "利用不可のみ"]
    availability_map = {
        "利用可能のみ": "AVAILABLE",
        "利用不可のみ": "UNAVAILABLE",
    }

    with st.expander("🔍 フィルタ", expanded=False):
        col1, col2 = st.columns(2, gap="medium")

        with col1:
            selected_level_labels = st.multiselect(
                "レベル",
                options=[level_label_map[lv] for lv in level_options],
                default=[level_label_map[lv] for lv in level_options if lv in st.session_state.filter_levels],
            )
            st.session_state.filter_levels = [lv for lv, label in level_label_map.items() if label in selected_level_labels]

            selected_performers = st.multiselect(
                "登場人物",
                options=performers,
                default=st.session_state.filter_actors,
                placeholder="名前で検索...",
            )
            st.session_state.filter_actors = selected_performers
            st.caption(
                f"選択中: {', '.join(selected_performers)} ({len(selected_performers)}名)"
                if selected_performers else "選択中: なし"
            )

        with col2:
            default_storage_labels = [label for label, code in storage_map.items() if code in st.session_state.filter_storage]
            selected_storage_labels = st.multiselect(
                "保存場所",
                options=storage_options,
                default=default_storage_labels or ["Cドライブのみ"],
            )
            selected_storage_codes = [storage_map[label] for label in selected_storage_labels]
            if not selected_storage_codes:
                selected_storage_codes = ["C_DRIVE"]
            st.session_state.filter_storage = selected_storage_codes

            default_avail_labels = [label for label, code in availability_map.items() if code in st.session_state.filter_availability]
            selected_avail_labels = st.multiselect(
                "利用可否",
                options=availability_options,
                default=default_avail_labels or ["利用可能のみ"],
            )
            selected_avail_codes = [availability_map[label] for label in selected_avail_labels]
            if not selected_avail_codes:
                selected_avail_codes = ["AVAILABLE"]
            st.session_state.filter_availability = selected_avail_codes

        refresh_clicked = st.button(
            "🔄 画面を更新",
            use_container_width=True,
            help="現在のフィルタ条件で一覧を再描画",
            key="library_refresh_btn",
        )
        if refresh_clicked:
            st.session_state.library_refresh_notice = True
            st.rerun(scope="fragment")

    if st.session_state.pop("library_refresh_notice", False):
        st.success("最新のフィルタで再描画しました")


@st.fragment
def render_library_tab(on_play, on_judge):
    """動画一覧タブを描画"""
    st.header("📚 動画一覧")

    # P1: キャッシュ版のKPI統計を使用
    kpi_stats = app_service.get_kpi_stats_cached()
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

    # 表示設定エクスパンダの直下にフィルタエクスパンダを配置
    _render_filter_controls()
    st.markdown("---")

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
