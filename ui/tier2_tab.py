"""
ClipBox - Tier 2（二次判定）タブ

サイドバーで「Tier 2」を選択したときに表示される画面。
ライブラリ・ランダム・運命の1本の3サブタブで構成される。

【設計制約】
- core/ に import streamlit しない原則に従い、UI処理はこのモジュールに閉じる
- @st.fragment を持つことで、サブ関数内の st.rerun(scope="fragment") が正常に動作する

【依存関係】
- ui/selection_tab.py: render_library_mode / render_random_mode / render_fate_mode
- core/app_service.py: get_selection_kpi（KPI 表示用）
"""

from __future__ import annotations

import streamlit as st

from core import app_service
from ui.components.kpi_display import render_selection_kpi_cards
from ui.selection_tab import render_library_mode, render_random_mode, render_fate_mode


@st.fragment
def render_tier2_tab(on_play, on_judge) -> None:
    """Tier 2（二次判定）画面を描画する。"""
    st.header("🎯 Tier 2 — 二次判定")

    cfg = st.session_state.get("user_config", {})
    folder_path_str = cfg.get("selection_folder", "")

    # セレクション KPI（タブ最上部）
    kpi = app_service.get_selection_kpi(folder_path_str if folder_path_str else None)
    render_selection_kpi_cards(
        unselected_count=kpi["unselected_count"],
        judged_count=kpi["judged_count"],
        judged_rate=kpi["judged_rate"],
        today_judged_count=kpi["today_judged_count"],
    )

    st.markdown("---")

    # セッション状態の初期化（selection_tab.py が前提とするキー）
    if "selection_page" not in st.session_state:
        st.session_state.selection_page = 1
    if "selection_page_size" not in st.session_state:
        st.session_state.selection_page_size = 100
    if "selection_last_signature" not in st.session_state:
        st.session_state.selection_last_signature = None
    if "selection_random_token" not in st.session_state:
        st.session_state.selection_random_token = None
    if "selection_random_videos" not in st.session_state:
        st.session_state.selection_random_videos = []
    if "selection_random_prev_n" not in st.session_state:
        st.session_state.selection_random_prev_n = 10
    if "selection_fate_video" not in st.session_state:
        st.session_state.selection_fate_video = None

    lib_tab, rand_tab, fate_tab = st.tabs(["📚 ライブラリ", "🎲 ランダム", "🎯 運命の1本"])

    with lib_tab:
        render_library_mode(on_play, on_judge, folder_path_str)

    with rand_tab:
        render_random_mode(on_play, on_judge, folder_path_str)

    with fate_tab:
        render_fate_mode(on_play, on_judge, folder_path_str, kpi)
