"""
ClipBox - セレクションタブ
!プレフィックス付き未選別動画の選別作業を支援する専用タブ。
"""

from __future__ import annotations

import math
from pathlib import Path

import streamlit as st

from core import app_service
from core.models import normalize_text, create_sort_key
from ui.components.display_settings import render_display_settings, DisplaySettings
from ui.components.video_card import render_video_card


SORT_OPTIONS = [
    "ファイル作成:新しい順",
    "ファイル作成:古い順",
    "お気に入り:高い順",
    "お気に入り:低い順",
    "タイトル:昇順",
    "タイトル:降順",
]

PAGE_SIZE_OPTIONS = [50, 100, 200]


def _render_kpi(kpi: dict) -> None:
    """セレクション KPI カードを横並びで表示"""
    cols = st.columns(4)
    with cols[0]:
        st.metric("📋 未選別", f"{kpi['unselected_count']}本", help="needs_selection=1かつ利用可能・未削除の動画数")
    with cols[1]:
        st.metric("✅ 選別済み", f"{kpi['judged_count']}本", help="セレクション判定済み動画数")
    with cols[2]:
        st.metric("📊 選別率", f"{kpi['judged_rate']:.1f}%", help="未選別+選別済みに対する選別済みの割合")
    with cols[3]:
        st.metric("📅 本日の選別", f"{kpi['today_judged_count']}本", help="今日0:00以降にセレクション判定した動画数")


def _reset_selection_page():
    st.session_state.selection_page = 1


@st.fragment
def render_selection_tab(on_play, on_judge):
    """セレクションタブの描画"""
    st.header("セレクション")

    # セッション状態の初期化（selection_folder_path は user_config から初期値を取得）
    if "selection_page" not in st.session_state:
        st.session_state.selection_page = 1
    if "selection_page_size" not in st.session_state:
        st.session_state.selection_page_size = 100
    if "selection_folder_path" not in st.session_state:
        cfg = st.session_state.get("user_config", {})
        st.session_state.selection_folder_path = cfg.get("selection_folder", "")
    if "selection_last_signature" not in st.session_state:
        st.session_state.selection_last_signature = None

    # フォルダ入力とスキャン
    folder_col, btn_col = st.columns([5, 1], gap="small")
    with folder_col:
        folder_path_str = st.text_input(
            "フォルダパス",
            value=st.session_state.selection_folder_path,
            placeholder="例: D:\\Selection\\2026-02",
            key="selection_folder_input",
            label_visibility="collapsed",
        )
        st.session_state.selection_folder_path = folder_path_str

    with btn_col:
        if st.button("🔍 スキャン", use_container_width=True, key="selection_scan_btn"):
            if folder_path_str:
                folder = Path(folder_path_str)
                with st.spinner("スキャン中..."):
                    result = app_service.scan_selection_folder(folder)
                if result["status"] == "success":
                    st.toast(result["message"])
                    st.rerun(scope="fragment")
                else:
                    st.error(result["message"])
            else:
                st.warning("フォルダパスを入力してください。")

    # KPI カード
    kpi = app_service.get_selection_kpi(folder_path_str if folder_path_str else None)
    _render_kpi(kpi)

    st.markdown("---")

    # コントロール行
    ctrl_col1, ctrl_col2, ctrl_col3, ctrl_col4, ctrl_col5 = st.columns(
        [1.2, 1.5, 2, 2, 1.2], gap="small"
    )

    with ctrl_col1:
        col_count = st.radio(
            "カラム数",
            options=[3, 4, 5, 6],
            index=2,
            horizontal=True,
            key="selection_col_count",
        )

    with ctrl_col2:
        display_filter = st.radio(
            "表示",
            options=["すべて", "未選別のみ", "選別済みのみ"],
            index=1,  # デフォルト: 未選別のみ
            horizontal=False,
            key="selection_display_filter",
        )

    with ctrl_col3:
        sort_option = st.selectbox(
            "ソート", options=SORT_OPTIONS, index=0, key="selection_sort"
        )

    with ctrl_col4:
        search_keyword = st.text_input(
            "タイトル検索",
            placeholder="タイトルの一部で検索...",
            key="selection_search",
        )

    with ctrl_col5:
        page_size = st.selectbox(
            "表示件数",
            options=PAGE_SIZE_OPTIONS,
            index=PAGE_SIZE_OPTIONS.index(st.session_state.selection_page_size)
            if st.session_state.selection_page_size in PAGE_SIZE_OPTIONS else 1,
            key="selection_page_size_select",
            on_change=_reset_selection_page,
        )
        st.session_state.selection_page_size = page_size

    settings: DisplaySettings = render_display_settings(key_prefix="selection_disp")
    settings.num_columns = col_count

    st.markdown("---")

    # 動画取得
    vm = st.session_state.video_manager

    if display_filter == "未選別のみ":
        needs_filter = True
    elif display_filter == "選別済みのみ":
        needs_filter = False
    else:
        needs_filter = None

    videos = vm.get_videos(
        show_unavailable=True,
        show_deleted=False,
        needs_selection_filter=needs_filter,
    )

    # フォルダパスで Python サイドフィルタ（startswith）
    if folder_path_str:
        norm_folder = folder_path_str.rstrip("/\\").lower()
        videos = [v for v in videos if v.current_full_path.lower().startswith(norm_folder)]

    # キーワードフィルタ
    if search_keyword:
        key_norm = normalize_text(search_keyword)
        videos = [v for v in videos if key_norm in normalize_text(v.essential_filename)]

    # ソート
    view_counts, last_viewed_map = app_service.get_view_counts_and_last_viewed()
    if sort_option:
        videos = sorted(
            videos,
            key=lambda v: create_sort_key(v, sort_option, view_counts, last_viewed_map),
        )

    # 条件変化時にページをリセット
    signature = (
        display_filter,
        sort_option,
        search_keyword,
        folder_path_str,
        st.session_state.selection_page_size,
    )
    if signature != st.session_state.selection_last_signature:
        _reset_selection_page()
        st.session_state.selection_last_signature = signature

    if not videos:
        st.info("条件に合う動画がありません。フォルダをスキャンしてください。")
        return

    # ページネーション
    total_pages = max(1, math.ceil(len(videos) / st.session_state.selection_page_size))
    if st.session_state.selection_page > total_pages:
        st.session_state.selection_page = total_pages

    _render_pagination(total_pages, "top")

    start_idx = (st.session_state.selection_page - 1) * st.session_state.selection_page_size
    end_idx = start_idx + st.session_state.selection_page_size
    page_videos = videos[start_idx:end_idx]

    # いいね数を一括取得
    video_ids = [v.id for v in page_videos]
    like_counts = app_service.get_like_counts(video_ids)

    col_count = max(1, min(6, settings.num_columns))

    for row_start in range(0, len(page_videos), col_count):
        row_videos = page_videos[row_start:row_start + col_count]
        cols = st.columns(col_count, gap="small")

        for col_idx, video in enumerate(row_videos):
            with cols[col_idx]:
                is_selected = bool(
                    st.session_state.selected_video
                    and st.session_state.selected_video.id == video.id
                )

                current_video = video

                def make_play_handler(vid):
                    def handler(v):
                        on_play(vid, "selection_tab")
                    return handler

                def make_judge_handler(vid):
                    def handler(v, level):
                        on_judge(vid, level)
                    return handler

                def make_like_handler(vid):
                    def handler(v):
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
                    show_selection_state=True,
                    is_selected=is_selected,
                    on_play_callback=make_play_handler(current_video),
                    on_judge_callback=make_judge_handler(current_video),
                    on_like_callback=make_like_handler(current_video),
                    key_prefix="selection",
                )

    _render_pagination(total_pages, "bottom")


def _render_pagination(total_pages: int, position: str):
    """ページネーション UI"""
    page = st.session_state.selection_page
    page = max(1, min(total_pages, page))
    st.session_state.selection_page = page

    col_prev, col_info, col_next = st.columns([1, 3, 1], gap="small")

    with col_prev:
        if st.button("◀ 前へ", use_container_width=True, disabled=page <= 1, key=f"selection_prev_{position}"):
            st.session_state.selection_page = max(1, page - 1)

    with col_info:
        page_numbers = list(range(1, total_pages + 1))
        selected_page = st.selectbox(
            "ページ選択",
            options=page_numbers,
            index=page - 1,
            key=f"selection_page_select_{position}",
            label_visibility="collapsed",
        )
        if selected_page != st.session_state.selection_page:
            st.session_state.selection_page = selected_page
        st.markdown(
            f"<div style='text-align:center; margin-top:0.25rem;'>"
            f"<strong>{st.session_state.selection_page}/{total_pages} ページ目</strong>"
            f"</div>",
            unsafe_allow_html=True,
        )

    with col_next:
        if st.button("次へ ▶", use_container_width=True, disabled=page >= total_pages, key=f"selection_next_{position}"):
            st.session_state.selection_page = min(total_pages, page + 1)
