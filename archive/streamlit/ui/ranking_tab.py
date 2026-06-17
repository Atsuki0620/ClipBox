# -*- coding: utf-8 -*-
"""
ClipBox - ランキングタブ

視聴回数・視聴日数・いいね数の3種ランキングを動画カードとして表示する。

【設計制約】
- core/ に import streamlit しない原則に従い、このファイルが UI 描画を担う
- キャッシュ関数 (_fetch_ranking) はこのファイル内で @st.cache_data として定義

【依存関係】
- core.app_service: get_ranked_videos_for_tab, get_like_counts, add_like
- ui.cache: get_view_counts_and_last_viewed
- ui.components.video_card: render_video_card
"""

import streamlit as st

from core import app_service
from ui import cache as ui_cache
from ui.components.display_settings import render_display_settings
from ui.components.video_card import render_video_card

_RANKING_TYPES = {
    "view_count": "視聴回数",
    "view_days": "視聴日数",
    "likes": "いいね数",
    "composite": "総合",
}
_SCORE_LABELS = {"view_count": "回", "view_days": "日", "likes": "個", "composite": "pt"}
_MEDAL = {1: "🥇", 2: "🥈", 3: "🥉"}
_MEDAL_COLOR = {1: "#FFD700", 2: "#C0C0C0", 3: "#CD7F32"}


@st.fragment
def render_ranking_tab(on_play, on_judge):
    st.subheader("🏆 ランキング")

    # --- コントロール行1 ---
    ctrl1, ctrl2 = st.columns([3, 2], gap="small")
    with ctrl1:
        ranking_type = st.radio(
            "ランキング種類",
            options=list(_RANKING_TYPES.keys()),
            format_func=lambda x: _RANKING_TYPES[x],
            index=3,
            horizontal=True,
            key="ranking_type",
        )
    with ctrl2:
        level_filter_label = st.radio(
            "レベルフィルタ",
            options=["制限なし", "Lv3以上", "Lv4のみ"],
            horizontal=True,
            key="ranking_level_filter",
        )
    _LEVEL_FILTER_MAP = {"制限なし": None, "Lv3以上": 3, "Lv4のみ": 4}
    min_level = _LEVEL_FILTER_MAP[level_filter_label]

    # --- コントロール行2 ---
    ctrl3, ctrl4, ctrl5 = st.columns([4, 3, 2], gap="small")
    with ctrl3:
        period_label = st.radio(
            "集計期間",
            options=["180日", "1年", "全期間"],
            index=2,
            horizontal=True,
            key="ranking_period",
        )
    with ctrl4:
        top_n = st.radio(
            "表示件数",
            options=[10, 20, 50],
            index=1,
            horizontal=True,
            key="ranking_top_n",
        )
    with ctrl5:
        show_unavailable = st.toggle("利用不可を含む", key="ranking_show_unavailable")

    # --- 表示設定 ---
    settings = render_display_settings(key_prefix="ranking_disp")

    # --- データ取得 ---
    availability_filter = "すべて" if show_unavailable else "利用可能のみ"
    with st.spinner("ランキングを集計中..."):
        ranked_items = _fetch_ranking(ranking_type, period_label, min_level, availability_filter, top_n)

    if not ranked_items:
        st.info("表示できるランキングデータがありません。")
        return

    # --- カード表示用キャッシュデータ ---
    view_counts, _ = ui_cache.get_view_counts_and_last_viewed()
    video_ids = [v.id for v, _ in ranked_items]
    like_counts = app_service.get_like_counts(video_ids)

    score_label = _SCORE_LABELS[ranking_type]

    # --- ランキングカード描画 ---
    for rank, (video, score) in enumerate(ranked_items, 1):
        rank_col, card_col = st.columns([1, 7], gap="small")

        with rank_col:
            medal = _MEDAL.get(rank)
            color = _MEDAL_COLOR.get(rank, "#888888")
            rank_html = (
                f'<span style="font-size:2em;">{medal}</span>'
                if medal
                else f'<span style="font-size:1.6em; font-weight:bold; color:{color};">#{rank}</span>'
            )
            st.markdown(
                f'<div style="text-align:center; padding:10px 4px;">'
                f'{rank_html}<br>'
                f'<span style="font-size:0.78em; color:#555;">{score}{score_label}</span>'
                f'</div>',
                unsafe_allow_html=True,
            )

        with card_col:
            def make_play_handler(vid):
                def handler(v):
                    on_play(vid, "ranking_tab")
                return handler

            def make_judge_handler(vid):
                def handler(v, level):
                    on_judge(vid, level)
                return handler

            def make_like_handler(vid):
                def handler(v):
                    new_count = app_service.add_like(vid.id)
                    like_counts[vid.id] = new_count
                    _fetch_ranking.clear()
                    st.rerun(scope="fragment")
                return handler

            render_video_card(
                video=video,
                settings=settings,
                view_count=view_counts.get(video.id, 0),
                like_count=like_counts.get(video.id, 0),
                on_play_callback=make_play_handler(video),
                on_judge_callback=make_judge_handler(video),
                on_like_callback=make_like_handler(video),
                key_prefix=f"ranking_{rank}",
            )

        st.divider()


@st.cache_data(ttl=60)
def _fetch_ranking(ranking_type, period_label, min_level, availability_filter, top_n):
    """ランキングデータを60秒キャッシュ"""
    return app_service.get_ranked_videos_for_tab(
        ranking_type=ranking_type,
        period_label=period_label,
        min_level=min_level,
        availability_filter=availability_filter,
        top_n=top_n,
    )
