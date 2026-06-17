"""
ClipBox - Tier 1（一次判定）タブ

サイドバーで「Tier 1」を選択したときに表示される画面。
ライブラリ・ランダム・運命の1本の3サブタブで構成される。

【設計制約】
- core/ に import streamlit しない原則に従い、UI処理はこのモジュールに閉じる
- @st.fragment を持つことで、サブ関数内の st.rerun(scope="fragment") が正常に動作する
- render_library_tab も @st.fragment を持つが、Streamlit はネストフラグメントをサポートする

【依存関係】
- ui/library_tab.py: render_library_tab
- ui/unrated_random_tab.py: render_random_mode / render_unrated_fate_mode
- ui/cache.py: get_kpi_stats_cached
- ui/components/kpi_display.py: render_kpi_cards
"""

from __future__ import annotations

import streamlit as st

from ui.library_tab import render_library_tab
from ui.unrated_random_tab import render_random_mode, render_unrated_fate_mode
from ui import cache as ui_cache
from ui.components.kpi_display import render_kpi_cards


@st.fragment
def render_tier1_tab(on_play, on_judge) -> None:
    """Tier 1（一次判定）画面を描画する。"""
    st.header("🎬 Tier 1 — 一次判定")

    kpi_stats = ui_cache.get_kpi_stats_cached()
    render_kpi_cards(
        unrated_count=kpi_stats["unrated_count"],
        judged_count=kpi_stats["judged_count"],
        judged_rate=kpi_stats["judged_rate"],
        today_judged_count=kpi_stats["today_judged_count"],
    )
    st.markdown("---")

    if "unrated_fate_video" not in st.session_state:
        st.session_state.unrated_fate_video = None

    lib_tab, rand_tab, fate_tab = st.tabs(["📚 ライブラリ", "🔀 ランダム", "🎯 運命の1本"])

    with lib_tab:
        render_library_tab(on_play, on_judge)

    with rand_tab:
        render_random_mode(on_play, on_judge)

    with fate_tab:
        render_unrated_fate_mode(on_play, on_judge, kpi_stats)
