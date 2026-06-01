"""
ClipBox - AVP再生タブ
複数動画をAwesome Video Playerで並列再生し、評価まで行う専用タブ。

【設計制約】
- subprocess による AVP 起動はここで直接行う（core/video_manager.play_video は1本再生専用）
- avp_selected_ids（全タブ横断チェック済みID）は streamlit_app.py の init_session_state で初期化
- avp_playing_ids（評価待ちID）は AVP 起動ボタン押下時にここで更新

【依存関係】
- st.session_state.avp_selected_ids: set[int]  各タブのチェックボックスで管理
- st.session_state.avp_playing_ids: list[int]  AVP起動後に評価待ち表示するID
- st.session_state.avp_launch_selected: set[int]  このタブ内「再生する4本」の選択状態
- st.session_state.user_config["avp_exe_path"]: str  AVP実行ファイルパス
"""

from __future__ import annotations

import subprocess
from pathlib import Path
from typing import Callable, List

import streamlit as st

from core import app_service
from ui import cache as ui_cache
from ui.components.display_settings import render_display_settings, DisplaySettings
from ui.components.video_card import render_video_card

_MAX_AVP_WINDOWS = 4


def _toggle_avp_launch(vid_id: int, cb_key: str) -> None:
    """「再生する動画」選択チェックボックスの変化時にセッションステートを更新する"""
    val: bool = st.session_state.get(cb_key, False)
    sel: set = st.session_state.get("avp_launch_selected", set())
    if val:
        sel.add(vid_id)
    else:
        sel.discard(vid_id)
    st.session_state.avp_launch_selected = sel


def _launch_avp(launch_ids: set, checked_videos: list) -> None:
    """AVPを起動して選択した動画を並列再生する"""
    cfg = st.session_state.user_config
    avp_path = cfg.get(
        "avp_exe_path",
        r"C:\Program Files (x86)\Awesome Video Player\AVPlayer.exe",
    )

    if not Path(avp_path).exists():
        st.error(f"AVPが見つかりません: {avp_path}\n設定タブでパスを確認してください。")
        return

    launch_videos = [v for v in checked_videos if v.id in launch_ids]
    file_paths = [
        str(v.current_full_path)
        for v in launch_videos
        if Path(v.current_full_path).exists()
    ]

    if not file_paths:
        st.error("再生できるファイルがありません（ファイルが見つかりません）。")
        return

    try:
        subprocess.Popen([avp_path] + file_paths)
    except Exception as e:
        st.error(f"AVP起動に失敗しました: {e}")
        return

    st.session_state.avp_playing_ids = [v.id for v in launch_videos]
    st.session_state.avp_launch_selected = set()
    st.toast(f"{len(file_paths)}本の動画をAVPで再生します")
    st.rerun(scope="fragment")


@st.fragment
def render_avp_tab(on_judge: Callable) -> None:
    """AVP再生タブを描画する。

    上段でチェック済み動画から4本を選んでAVP起動。
    下段にAVP起動後の評価カードを表示する。
    """
    st.header("🎬 AVP再生")

    avp_ids: set = st.session_state.get("avp_selected_ids", set())
    avp_playing_ids: list = st.session_state.get("avp_playing_ids", [])
    avp_launch_selected: set = st.session_state.get("avp_launch_selected", set())

    # ── 上段: チェック済み一覧 ─────────────────────────────────────────
    n_checked = len(avp_ids)
    st.subheader(f"📋 チェック済み（{n_checked}本）")

    if not avp_ids:
        st.info("他のタブで動画カードの ☐ をONにすると、ここにリストが表示されます。")
    else:
        vm = st.session_state.video_manager
        all_videos = vm.get_videos(show_unavailable=True, show_deleted=False)
        checked_videos = [v for v in all_videos if v.id in avp_ids]

        st.caption(f"再生する動画を選択してください（最大{_MAX_AVP_WINDOWS}本）")

        col_count = 3
        for row_start in range(0, len(checked_videos), col_count):
            row_videos = checked_videos[row_start:row_start + col_count]
            cols = st.columns(col_count, gap="small")
            for col_idx, video in enumerate(row_videos):
                with cols[col_idx]:
                    cb_key = f"avp_launch_{video.id}"
                    current_sel = video.id in avp_launch_selected
                    max_reached = (
                        len(avp_launch_selected) >= _MAX_AVP_WINDOWS and not current_sel
                    )
                    st.checkbox(
                        video.essential_filename,
                        key=cb_key,
                        value=current_sel,
                        disabled=max_reached,
                        on_change=_toggle_avp_launch,
                        args=(video.id, cb_key),
                    )

        n_sel = len(avp_launch_selected)
        st.markdown(f"**{n_sel}本選択中**")

        col_play, col_clear = st.columns([2, 1])
        with col_play:
            play_label = f"▶ AVPで{n_sel}本再生" if n_sel > 0 else "▶ AVP再生（動画を選択してください）"
            if st.button(
                play_label,
                disabled=n_sel == 0,
                use_container_width=True,
                type="primary",
                key="avp_launch_btn",
            ):
                _launch_avp(avp_launch_selected, checked_videos)
        with col_clear:
            if st.button("🗑 リストクリア", use_container_width=True, key="avp_clear_btn"):
                st.session_state.avp_selected_ids = set()
                st.session_state.avp_launch_selected = set()
                st.session_state.avp_playing_ids = []
                st.rerun(scope="fragment")

    # ── 下段: 評価待ちカード ──────────────────────────────────────────
    if avp_playing_ids:
        st.markdown("---")
        st.subheader("⭐ 評価待ち")

        vm = st.session_state.video_manager
        all_videos = vm.get_videos(show_unavailable=True, show_deleted=False)
        playing_videos = [v for v in all_videos if v.id in avp_playing_ids]

        if not playing_videos:
            st.info("評価対象の動画が見つかりません。")
            return

        settings: DisplaySettings = render_display_settings(key_prefix="avp_disp")
        view_counts, _ = ui_cache.get_view_counts_and_last_viewed()
        video_ids = [v.id for v in playing_videos]
        like_counts = app_service.get_like_counts(video_ids)

        col_count = min(_MAX_AVP_WINDOWS, len(playing_videos))
        cols = st.columns(col_count, gap="small")

        for col_idx, video in enumerate(playing_videos):
            with cols[col_idx]:
                current_video = video

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
                    is_selected=False,
                    on_play_callback=None,
                    on_judge_callback=make_judge_handler(current_video),
                    on_like_callback=make_like_handler(current_video),
                    key_prefix="avp_eval",
                )
