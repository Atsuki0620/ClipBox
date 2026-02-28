"""
ClipBox - 検索タブ
ファイル名でDB内動画を横断検索する。
"""

from __future__ import annotations

import streamlit as st

from core import app_service
from core.models import normalize_text
from ui import cache as ui_cache
from ui.components.display_settings import render_display_settings, DisplaySettings
from ui.components.video_card import render_search_video_card



@st.fragment
def render_search_tab(on_play, on_judge):
    """検索タブを描画"""
    st.header("🔎 検索")

    # セッションステートの初期化
    if "search_executed" not in st.session_state:
        st.session_state.search_executed = False
    if "search_tab_keyword" not in st.session_state:
        st.session_state.search_tab_keyword = ""
    if "search_tab_storage" not in st.session_state:
        st.session_state.search_tab_storage = ["C_DRIVE", "EXTERNAL_HDD"]

    # 検索フォーム（Enter キーまたはボタンで submit）
    with st.form("search_form"):
        col_kw, col_c, col_hdd, col_btn = st.columns([5, 1, 1, 1], gap="small")
        with col_kw:
            keyword = st.text_input(
                "ファイル名",
                value=st.session_state.search_tab_keyword,
                placeholder="ファイル名の一部を入力（空白で全件表示）",
                label_visibility="collapsed",
            )
        with col_c:
            c_drive = st.checkbox("Cドライブ", value="C_DRIVE" in st.session_state.search_tab_storage)
        with col_hdd:
            ext_hdd = st.checkbox("外付けHDD", value="EXTERNAL_HDD" in st.session_state.search_tab_storage)
        with col_btn:
            submitted = st.form_submit_button("🔍 検索", use_container_width=True)

    if submitted:
        storage = []
        if c_drive:
            storage.append("C_DRIVE")
        if ext_hdd:
            storage.append("EXTERNAL_HDD")
        # どちらも未選択の場合は全件対象
        if not storage:
            storage = ["C_DRIVE", "EXTERNAL_HDD"]

        st.session_state.search_tab_keyword = keyword
        st.session_state.search_tab_storage = storage
        st.session_state.search_executed = True

    if not st.session_state.search_executed:
        st.info("ファイル名を入力して検索してください。")
        return

    # --- 検索実行 ---
    vm = st.session_state.video_manager
    storage_filter = st.session_state.search_tab_storage
    # 両方選択されていれば storage_locations=None（全件）
    if set(storage_filter) == {"C_DRIVE", "EXTERNAL_HDD"}:
        storage_locations = None
    else:
        storage_locations = storage_filter

    videos = vm.get_videos(
        storage_locations=storage_locations,
        show_unavailable=True,
        show_deleted=False,
    )

    # キーワード部分一致フィルタ
    kw = st.session_state.search_tab_keyword
    if kw:
        kw_norm = normalize_text(kw)
        videos = [v for v in videos if kw_norm in normalize_text(v.essential_filename)]

    st.caption(f"{len(videos)} 件ヒット")

    settings: DisplaySettings = render_display_settings(key_prefix="search_disp")

    if not videos:
        st.info("条件に合う動画が見つかりません。")
        return

    view_counts, last_viewed_map = ui_cache.get_view_counts_and_last_viewed()

    video_ids = [v.id for v in videos]
    like_counts = app_service.get_like_counts(video_ids)

    for video in videos:
        current_video = video

        def make_play_handler(vid):
            def handler(v):
                on_play(vid, "row_button")
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

        render_search_video_card(
            video=current_video,
            settings=settings,
            view_count=view_counts.get(current_video.id, 0),
            like_count=like_counts.get(current_video.id, 0),
            last_modified=current_video.last_file_modified,
            on_play_callback=make_play_handler(current_video),
            on_judge_callback=make_judge_handler(current_video),
            on_like_callback=make_like_handler(current_video),
            key_prefix="search",
        )
