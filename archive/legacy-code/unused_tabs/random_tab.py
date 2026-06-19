from __future__ import annotations

import streamlit as st
from core import app_service
from config import FAVORITE_LEVEL_NAMES

@st.fragment
def render_random_tab(on_play):
    """ランダム再生タブ（2026-01-25 時点の退避版）"""
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
