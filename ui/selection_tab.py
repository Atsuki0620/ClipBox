"""
ClipBox - セレクションタブ
!プレフィックス付き未選別動画の選別作業を支援する専用タブ。
"""

from __future__ import annotations

import math
import random
import uuid
from pathlib import Path

import streamlit as st

from core import app_service
from core.models import normalize_text, create_sort_key
from ui import cache as ui_cache
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

def _reset_selection_page():
    st.session_state.selection_page = 1


def render_library_mode(on_play, on_judge, folder_path_str: str):
    """ライブラリモードの描画"""
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
            index=1,
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

    if folder_path_str:
        norm_folder = folder_path_str.rstrip("/\\").lower()
        videos = [v for v in videos if v.current_full_path.lower().startswith(norm_folder)]

    if search_keyword:
        key_norm = normalize_text(search_keyword)
        videos = [v for v in videos if key_norm in normalize_text(v.essential_filename)]

    view_counts, last_viewed_map = ui_cache.get_view_counts_and_last_viewed()
    if sort_option:
        videos = sorted(
            videos,
            key=lambda v: create_sort_key(v, sort_option, view_counts, last_viewed_map),
        )

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
        st.info("条件に合う動画がありません。設定タブでフォルダをスキャンしてください。")
        return

    total_pages = max(1, math.ceil(len(videos) / st.session_state.selection_page_size))
    if st.session_state.selection_page > total_pages:
        st.session_state.selection_page = total_pages

    _render_pagination(total_pages, "top")

    start_idx = (st.session_state.selection_page - 1) * st.session_state.selection_page_size
    end_idx = start_idx + st.session_state.selection_page_size
    page_videos = videos[start_idx:end_idx]

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
                    show_avp_checkbox=True,
                    is_avp_checked=current_video.id in st.session_state.get("avp_selected_ids", set()),
                    on_play_callback=make_play_handler(current_video),
                    on_judge_callback=make_judge_handler(current_video),
                    on_like_callback=make_like_handler(current_video),
                    key_prefix="selection",
                )

    _render_pagination(total_pages, "bottom")


def render_random_mode(on_play, on_judge, folder_path_str: str):
    """ランダムモードの描画"""
    ctrl_col1, ctrl_col2, ctrl_col3 = st.columns([1.5, 1.5, 2], gap="small")

    with ctrl_col1:
        rand_col_count = st.radio(
            "カラム数",
            options=[3, 4, 5, 6],
            index=2,
            horizontal=True,
            key="selection_rand_col_count",
        )

    with ctrl_col2:
        num_videos = st.radio(
            "表示件数",
            options=[5, 10, 15, 20],
            index=1,
            horizontal=True,
            key="selection_rand_num_videos",
        )

    with ctrl_col3:
        shuffle = st.button("🔀 シャッフル", width="stretch", key="selection_rand_shuffle")

    prev_n = st.session_state.selection_random_prev_n
    vm = st.session_state.video_manager
    if shuffle or num_videos != prev_n or not st.session_state.selection_random_videos:
        videos = vm.get_videos(
            needs_selection_filter=True,
            show_unavailable=False,
            show_deleted=False,
        )
        if folder_path_str:
            norm_folder = folder_path_str.rstrip("/\\").lower()
            videos = [v for v in videos if v.current_full_path.lower().startswith(norm_folder)]
        sample = random.sample(videos, min(num_videos, len(videos)))
        st.session_state.selection_random_videos = sample
        st.session_state.selection_random_prev_n = num_videos
        st.session_state.selection_random_token = str(uuid.uuid4())
    else:
        # 判定などによるDB変更を反映するため、キャッシュIDで再取得して同期する
        cached_ids = [v.id for v in st.session_state.selection_random_videos]
        st.session_state.selection_random_videos = vm.get_videos_by_ids(cached_ids)

    sample_videos = st.session_state.selection_random_videos

    if not sample_videos:
        st.info("条件に合う未選別動画がありません。設定タブでフォルダをスキャンしてください。")
        return

    st.caption(f"{len(sample_videos)} 件表示中（未選別動画からランダム抽出）")

    video_ids = [v.id for v in sample_videos]
    like_counts = app_service.get_like_counts(video_ids)
    view_counts, _ = ui_cache.get_view_counts_and_last_viewed()

    settings_rand = render_display_settings(key_prefix="selection_rand_disp")
    settings_rand.num_columns = rand_col_count

    col_count = max(1, min(6, rand_col_count))

    for row_start in range(0, len(sample_videos), col_count):
        row_videos = sample_videos[row_start:row_start + col_count]
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
                    settings=settings_rand,
                    view_count=view_counts.get(current_video.id, 0),
                    like_count=like_counts.get(current_video.id, 0),
                    last_modified=current_video.last_file_modified,
                    show_judgment_ui=True,
                    show_selection_state=True,
                    is_selected=is_selected,
                    show_avp_checkbox=True,
                    is_avp_checked=current_video.id in st.session_state.get("avp_selected_ids", set()),
                    on_play_callback=make_play_handler(current_video),
                    on_judge_callback=make_judge_handler(current_video),
                    on_like_callback=make_like_handler(current_video),
                    key_prefix="selection_rand",
                )


def render_fate_mode(on_play, on_judge, folder_path_str: str, kpi: dict):
    """運命の1本モードの描画。経過日数重み付きで未選別動画を1本選出・再生・評価する。"""
    vm = st.session_state.video_manager

    # フォルダ込みの未選別数は上位で算出済みの kpi を流用（余分なDBクエリを避ける）
    has_candidates = kpi["unselected_count"] > 0

    _, btn_col, _ = st.columns([1, 2, 1])
    with btn_col:
        draw = st.button(
            "🎯 運命の1本を引く",
            width="stretch",
            disabled=not has_candidates,
            key="selection_fate_draw",
        )

    if draw:
        video = vm.get_fate_video(folder_path_str)
        if video:
            st.session_state.selection_fate_video = video
            on_play(video, "selection_fate")

    st.divider()

    fate_video = st.session_state.selection_fate_video

    if fate_video is None:
        if has_candidates:
            st.info("ボタンを押して運命の1本を引いてください。")
        else:
            st.info("条件に合う未選別動画がありません。設定タブでフォルダをスキャンしてください。")
        return

    # DB同期（判定・いいね反映）
    synced = vm.get_videos_by_ids([fate_video.id])
    if not synced:
        st.session_state.selection_fate_video = None
        st.warning("選出した動画が見つかりません。再度引き直してください。")
        return
    fate_video = synced[0]
    st.session_state.selection_fate_video = fate_video

    video_ids = [fate_video.id]
    like_counts = app_service.get_like_counts(video_ids)
    view_counts, _ = ui_cache.get_view_counts_and_last_viewed()

    settings_fate = render_display_settings(key_prefix="selection_fate_disp")
    settings_fate.num_columns = 1

    is_selected = bool(
        st.session_state.selected_video
        and st.session_state.selected_video.id == fate_video.id
    )

    def play_handler(_v):
        on_play(fate_video, "selection_fate")

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
            show_selection_state=True,
            is_selected=is_selected,
            show_avp_checkbox=True,
            is_avp_checked=fate_video.id in st.session_state.get("avp_selected_ids", set()),
            on_play_callback=play_handler,
            on_judge_callback=judge_handler,
            on_like_callback=like_handler,
            key_prefix="selection_fate",
        )

    st.caption("重み: 前回視聴からの経過日数（未視聴は9999日扱い）")


def _render_pagination(total_pages: int, position: str):
    """ページネーション UI"""
    page = st.session_state.selection_page
    page = max(1, min(total_pages, page))
    st.session_state.selection_page = page

    col_prev, col_info, col_next = st.columns([1, 3, 1], gap="small")

    with col_prev:
        if st.button("◀ 前へ", width="stretch", disabled=page <= 1, key=f"selection_prev_{position}"):
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
        if st.button("次へ ▶", width="stretch", disabled=page >= total_pages, key=f"selection_next_{position}"):
            st.session_state.selection_page = min(total_pages, page + 1)
