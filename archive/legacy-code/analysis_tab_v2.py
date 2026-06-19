"""
ClipBox - 分析ダッシュボード v2

リニューアル版。4タブ構成でスクロール量を削減し、
各テーマに絞って分析できる。

タブ構成:
  📋 概要   - KPI5枚 + セレクション成果
  📈 推移   - 視聴・判定エリアチャート（上下2段）
  📦 構成   - レベル別棒 / 保存先表 / 容量・視聴分布
  🏆 ランキング - 視聴回数|視聴日数|いいね 横並びサブタブ
"""

from __future__ import annotations

from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional, Tuple

import pandas as pd
import streamlit as st
import plotly.express as px

from core import app_service

# ライト・クリーン配色（既存 PALETTE と同一）
_PALETTE = ["#68d3ff", "#a855f7", "#22d3ee", "#f97316", "#fb7185", "#c7d2fe"]

_LEVEL_COLORS = {
    -1: "#9ca3af",
    0: "#d1d5db",
    1: "#93c5fd",
    2: "#3b82f6",
    3: "#2563eb",
    4: "#1d4ed8",
}

_TOP_N_OPTIONS = [10, 20, 50, 100]


# ---------------------------------------------------------------------------
# データロード（10分キャッシュ）
# ---------------------------------------------------------------------------

@st.cache_data(ttl=600)
def _load_data(include_deleted: bool) -> pd.DataFrame:
    is_deleted_filter = None if include_deleted else 0
    return app_service.load_analysis_data(is_deleted_filter)


# ---------------------------------------------------------------------------
# 共通ウィジェット
# ---------------------------------------------------------------------------

def _period_widgets(key_prefix: str) -> Tuple[Optional[datetime], Optional[datetime]]:
    """期間プリセット + カスタム日付入力を描画して (period_start, period_end) を返す。"""
    col_p, col_c = st.columns([2, 2])
    with col_p:
        preset = st.selectbox(
            "期間",
            options=["全期間", "直近7日", "直近30日", "直近90日", "直近180日", "カスタム"],
            index=0,
            key=f"{key_prefix}_preset",
        )
    custom_range = None
    if preset == "カスタム":
        with col_c:
            custom_range = st.date_input(
                "期間を指定",
                value=(
                    datetime.now().date() - timedelta(days=30),
                    datetime.now().date(),
                ),
                max_value=datetime.now().date(),
                key=f"{key_prefix}_custom",
            )
    try:
        return app_service.convert_period_filter(preset, custom_range)
    except ValueError as e:
        st.error(f"❗ {e}")
        return None, None


def _granularity_radio(key: str) -> str:
    return st.radio(
        "集計粒度",
        options=["日別", "週別", "月別"],
        horizontal=True,
        label_visibility="collapsed",
        key=key,
    )


def _bucket_series(df: pd.DataFrame, dt_col: str, gran: str) -> pd.Series:
    """datetime 列を粒度に応じたバケットに変換する。"""
    s = pd.to_datetime(df[dt_col])
    if gran == "週別":
        return s.dt.to_period("W").apply(lambda p: p.start_time.date())
    if gran == "月別":
        return s.dt.to_period("M").apply(lambda p: p.start_time.date())
    return s.dt.date


# ---------------------------------------------------------------------------
# エリアチャート ヘルパー
# ---------------------------------------------------------------------------

def _area_chart(
    df: pd.DataFrame,
    x_col: str,
    y_col: str,
    title: str,
    color: str,
    height: int = 280,
) -> None:
    if df.empty or df[y_col].sum() == 0:
        st.info(f"「{title}」のデータがありません。")
        return
    fig = px.area(
        df,
        x=x_col,
        y=y_col,
        color_discrete_sequence=[color],
        labels={x_col: "", y_col: y_col},
    )
    fig.update_layout(
        title=dict(text=title, font=dict(size=15)),
        height=height,
        margin=dict(t=44, b=30, l=10, r=10),
        xaxis_tickangle=-25,
        plot_bgcolor="rgba(0,0,0,0)",
        paper_bgcolor="rgba(0,0,0,0)",
    )
    fig.update_xaxes(tickformat="%Y/%m/%d", showgrid=True, gridcolor="#e5e7eb")
    fig.update_yaxes(showgrid=True, gridcolor="#e5e7eb")
    st.plotly_chart(fig, use_container_width=True)


# ---------------------------------------------------------------------------
# Tab 1: 概要
# ---------------------------------------------------------------------------

def _render_tab_overview(df_base: pd.DataFrame) -> None:
    df = app_service.apply_scope_filter(df_base, "すべて")
    df = app_service.calculate_period_view_count(df, None, None)

    if df.empty:
        st.info("データがありません。ファイルをスキャンしてください。")
        return

    # --- KPI カード ---
    total_videos = len(df)
    total_size_gb = df["file_size"].fillna(0).sum() / (1024 ** 3)
    viewed = int((df["total_view_count"] > 0).sum())
    unviewed = int((df["total_view_count"] == 0).sum())
    total_views = int(df["total_view_count"].sum())

    c1, c2, c3, c4, c5 = st.columns(5)
    c1.metric("総動画数", f"{total_videos:,} 本")
    c2.metric("総容量", f"{total_size_gb:,.1f} GB")
    c3.metric("視聴済み", f"{viewed:,} 本")
    c4.metric("未視聴", f"{unviewed:,} 本")
    c5.metric("累計視聴回数", f"{total_views:,} 回")

    st.divider()

    # --- セレクション成果 ---
    st.subheader("🎯 セレクション成果")
    trend_df = app_service.get_selection_judgment_trend(None, None)
    dist_df = app_service.get_selection_level_distribution()

    col_l, col_r = st.columns(2, gap="large")

    with col_l:
        h_l, h_r = st.columns([2, 1])
        with h_l:
            st.markdown("**選別数の推移**")
        with h_r:
            gran = _granularity_radio("v2_ov_gran")

        if trend_df.empty:
            st.info("セレクション判定データがありません。")
        else:
            trend_df["date"] = pd.to_datetime(trend_df["date"])
            trend_df["bucket"] = _bucket_series(trend_df, "date", gran)
            agg = trend_df.groupby("bucket")["count"].sum().reset_index(name="選別数")
            _area_chart(agg, "bucket", "選別数", "選別数の推移", _PALETTE[4], height=260)

    with col_r:
        st.markdown("**選別結果のレベル分布**")
        if dist_df.empty:
            st.info("セレクション判定データがありません。")
        else:
            dist_df["level_label"] = dist_df["level"].map(
                lambda l: "未判定" if l == -1 else f"Lv{l}"
            )
            dist_df["color"] = dist_df["level"].map(
                lambda l: _LEVEL_COLORS.get(l, "#6b7280")
            )
            fig = px.bar(
                dist_df,
                x="level_label",
                y="count",
                color="level_label",
                color_discrete_map={
                    row["level_label"]: row["color"] for _, row in dist_df.iterrows()
                },
                labels={"level_label": "レベル", "count": "選別数"},
            )
            fig.update_layout(
                height=260,
                margin=dict(t=10, b=30, l=10, r=10),
                showlegend=False,
                plot_bgcolor="rgba(0,0,0,0)",
                paper_bgcolor="rgba(0,0,0,0)",
            )
            fig.update_yaxes(showgrid=True, gridcolor="#e5e7eb")
            st.plotly_chart(fig, use_container_width=True)


# ---------------------------------------------------------------------------
# Tab 2: 推移
# ---------------------------------------------------------------------------

def _render_tab_trends(df_base: pd.DataFrame) -> None:
    # フィルタ行
    col_f1, col_f2, col_f3 = st.columns([3, 3, 2])
    with col_f1:
        preset = st.selectbox(
            "期間",
            options=["全期間", "直近7日", "直近30日", "直近90日", "直近180日", "カスタム"],
            index=0,
            key="v2_tr_preset",
        )
    custom_range = None
    if preset == "カスタム":
        with col_f2:
            custom_range = st.date_input(
                "期間を指定",
                value=(
                    datetime.now().date() - timedelta(days=30),
                    datetime.now().date(),
                ),
                max_value=datetime.now().date(),
                key="v2_tr_custom",
            )
    with col_f3:
        gran = _granularity_radio("v2_tr_gran")

    try:
        period_start, period_end = app_service.convert_period_filter(preset, custom_range)
    except ValueError as e:
        st.error(f"❗ {e}")
        return

    df = app_service.apply_scope_filter(df_base, "すべて")
    if df.empty:
        st.info("データがありません。")
        return

    video_ids = df["id"].tolist()

    # --- 視聴回数エリアチャート ---
    views_df = app_service.get_viewing_history(period_start, period_end, video_ids)
    if not views_df.empty:
        views_df["bucket"] = _bucket_series(views_df, "viewed_at", gran)
        trend_v = views_df.groupby("bucket").size().reset_index(name="視聴回数")
        _area_chart(trend_v, "bucket", "視聴回数", "📈 視聴回数の推移", _PALETTE[0], height=300)
    else:
        st.info("指定期間内の視聴履歴がありません。")

    # --- 判定数エリアチャート ---
    judg_df = app_service.get_judgment_history(period_start, period_end, video_ids)
    if not judg_df.empty:
        judg_df["bucket"] = _bucket_series(judg_df, "judged_at", gran)
        judg_df = judg_df.drop_duplicates(subset=["video_id", "bucket"])
        trend_j = judg_df.groupby("bucket").size().reset_index(name="判定数")
        _area_chart(trend_j, "bucket", "判定数", "🧮 判定数の推移", _PALETTE[1], height=300)
    else:
        st.info("指定期間内の判定履歴がありません。")


# ---------------------------------------------------------------------------
# Tab 3: 構成
# ---------------------------------------------------------------------------

def _render_tab_composition(df_base: pd.DataFrame) -> None:
    # 利用可否フィルタ
    availability = st.selectbox(
        "利用可能性",
        options=["利用可能のみ", "利用不可のみ", "すべて"],
        index=0,
        key="v2_cp_avail",
    )
    df = app_service.apply_scope_filter(df_base, availability)

    if df.empty:
        st.info("条件に合致するデータがありません。")
        return

    # --- レベル別棒グラフ（左）+ 保存先テーブル（右） ---
    col_l, col_r = st.columns([2, 1], gap="large")

    with col_l:
        st.subheader("📊 レベル別集計")
        metric = st.radio(
            "表示項目",
            options=["動画本数", "総容量(GB)"],
            horizontal=True,
            index=0,
            key="v2_cp_metric",
        )
        grouped = df.groupby(["current_favorite_level", "storage_location"])
        if metric == "動画本数":
            data = grouped.size().reset_index(name="value")
            y_label = "動画数"
        else:
            data = grouped["file_size"].sum().reset_index(name="value")
            data["value"] = data["value"] / (1024 ** 3)
            y_label = "総容量(GB)"

        fig = px.bar(
            data,
            x="current_favorite_level",
            y="value",
            color="storage_location",
            barmode="stack",
            color_discrete_sequence=_PALETTE,
            labels={
                "current_favorite_level": "お気に入りレベル",
                "value": y_label,
                "storage_location": "保存先",
            },
        )
        fig.update_layout(
            xaxis=dict(dtick=1),
            height=320,
            margin=dict(t=10, b=40, l=10, r=10),
            plot_bgcolor="rgba(0,0,0,0)",
            paper_bgcolor="rgba(0,0,0,0)",
        )
        fig.update_yaxes(showgrid=True, gridcolor="#e5e7eb")
        st.plotly_chart(fig, use_container_width=True)

    with col_r:
        st.subheader("💿 保存先別")
        storage_table = (
            df.groupby("storage_location")
            .agg(
                動画数=("id", "size"),
                容量_GB=("file_size", lambda s: round(s.fillna(0).sum() / (1024 ** 3), 2)),
                視聴済み=("total_view_count", lambda x: int((x > 0).sum())),
            )
            .reset_index()
            .rename(columns={"storage_location": "保存場所", "容量_GB": "容量(GB)"})
        )
        storage_table["視聴済み率"] = (
            (storage_table["視聴済み"] / storage_table["動画数"] * 100)
            .round(1)
            .astype(str) + "%"
        )
        preferred_order = ["C_DRIVE", "EXTERNAL_HDD"]
        storage_table["_sort"] = storage_table["保存場所"].apply(
            lambda loc: preferred_order.index(loc) if loc in preferred_order else len(preferred_order)
        )
        storage_table = storage_table.sort_values("_sort").drop(columns="_sort")
        st.dataframe(storage_table, use_container_width=True, hide_index=True, height=200)

    st.divider()

    # --- 分布チャート（2カラム） ---
    col_d1, col_d2 = st.columns(2, gap="large")

    with col_d1:
        st.subheader("📦 容量分布")
        df_sz = df.copy()
        df_sz["file_size_gb"] = df_sz["file_size"].fillna(0) / (1024 ** 3)
        fig = px.histogram(
            df_sz,
            x="file_size_gb",
            nbins=20,
            color_discrete_sequence=[_PALETTE[0]],
            labels={"file_size_gb": "ファイルサイズ (GB)", "count": "本数"},
        )
        fig.update_layout(
            height=280,
            margin=dict(t=10, b=40, l=10, r=10),
            plot_bgcolor="rgba(0,0,0,0)",
            paper_bgcolor="rgba(0,0,0,0)",
        )
        fig.update_yaxes(showgrid=True, gridcolor="#e5e7eb")
        st.plotly_chart(fig, use_container_width=True)

    with col_d2:
        st.subheader("📊 視聴回数分布 (1回以上)")
        vc_col = "total_view_count"
        df_viewed = df[df[vc_col] > 0]
        if df_viewed.empty:
            st.info("視聴済みデータがありません。")
        else:
            dist = df_viewed[vc_col]
            max_vc = int(dist.max())
            min_vc = int(dist.min())
            fig = px.histogram(
                dist,
                x=dist,
                nbins=max(1, max_vc - min_vc + 1),
                color_discrete_sequence=[_PALETTE[5]],
                labels={"value": "視聴回数", "count": "本数"},
            )
            fig.update_xaxes(dtick=1)
            fig.update_layout(
                height=280,
                margin=dict(t=10, b=40, l=10, r=10),
                plot_bgcolor="rgba(0,0,0,0)",
                paper_bgcolor="rgba(0,0,0,0)",
            )
            fig.update_yaxes(showgrid=True, gridcolor="#e5e7eb")
            st.plotly_chart(fig, use_container_width=True)


# ---------------------------------------------------------------------------
# Tab 4: ランキング
# ---------------------------------------------------------------------------

def _render_ranking_section(
    df: pd.DataFrame,
    period_start: Optional[datetime],
    period_end: Optional[datetime],
    rank_type: str,
) -> None:
    """横棒グラフ＋テーブル切替のランキングセクション。"""
    if df.empty:
        st.info("データがありません。")
        return

    max_n = int(df.shape[0])
    valid_top_n = [n for n in _TOP_N_OPTIONS if n <= max_n] or [max_n]

    ctrl_l, ctrl_r = st.columns([2, 2])
    with ctrl_l:
        top_n = st.radio(
            "Top N",
            options=valid_top_n,
            index=min(1, len(valid_top_n) - 1),
            horizontal=True,
            key=f"v2_rk_topn_{rank_type}",
        )
    with ctrl_r:
        view_mode = st.radio(
            "表示形式",
            options=["グラフ", "テーブル"],
            horizontal=True,
            key=f"v2_rk_mode_{rank_type}",
        )

    # データ取得
    if rank_type == "view_count":
        ranking_df = app_service.get_view_count_ranking(df, top_n=top_n)
        val_col = "視聴回数"
    elif rank_type == "view_days":
        ranking_df = app_service.get_view_days_ranking(df, period_start, period_end, top_n=top_n)
        val_col = "視聴日数"
    else:
        ranking_df = app_service.get_like_count_ranking(df, top_n=top_n)
        val_col = "いいね数"

    if ranking_df.empty:
        st.info("ランキングデータがありません。")
        return

    if view_mode == "グラフ":
        # 上位が上に来るよう逆順で横棒グラフ
        plot_df = ranking_df.copy().iloc[::-1].reset_index(drop=True)
        fig = px.bar(
            plot_df,
            x=val_col,
            y="ファイル名",
            orientation="h",
            color_discrete_sequence=[_PALETTE[2]],
            labels={val_col: val_col, "ファイル名": ""},
            text=val_col,
        )
        fig.update_traces(textposition="outside")
        fig.update_layout(
            height=max(300, top_n * 22),
            margin=dict(t=10, l=10, r=50, b=30),
            yaxis=dict(tickfont=dict(size=11)),
            plot_bgcolor="rgba(0,0,0,0)",
            paper_bgcolor="rgba(0,0,0,0)",
        )
        fig.update_xaxes(showgrid=True, gridcolor="#e5e7eb")
        st.plotly_chart(fig, use_container_width=True)
    else:
        col_cfg = {
            "順位": st.column_config.NumberColumn("順位", width="small"),
            "ファイル名": st.column_config.TextColumn("ファイル名", width="large"),
            "利用可否": st.column_config.TextColumn("利用可否", width="small"),
            "保存場所": st.column_config.TextColumn("保存場所", width="small"),
            "ファイル作成日": st.column_config.TextColumn("ファイル作成日", width="small"),
            "お気に入りレベル": st.column_config.NumberColumn("お気に入りレベル", width="small"),
            val_col: st.column_config.NumberColumn(val_col, width="small"),
        }
        st.dataframe(
            ranking_df,
            use_container_width=True,
            height=min(420, top_n * 35 + 50),
            hide_index=True,
            column_config=col_cfg,
        )


def _render_tab_ranking(df_base: pd.DataFrame) -> None:
    # 期間フィルタ（ランキングに適用）
    period_start, period_end = _period_widgets("v2_rk")

    df = app_service.apply_scope_filter(df_base, "すべて")
    df = app_service.calculate_period_view_count(df, period_start, period_end)

    if df.empty:
        st.info("データがありません。")
        return

    # 3種ランキングの横並びサブタブ
    rt1, rt2, rt3 = st.tabs(["🏆 視聴回数", "📅 視聴日数", "👍 いいね"])

    with rt1:
        _render_ranking_section(df, period_start, period_end, "view_count")
    with rt2:
        _render_ranking_section(df, period_start, period_end, "view_days")
    with rt3:
        _render_ranking_section(df, period_start, period_end, "likes")


# ---------------------------------------------------------------------------
# エントリーポイント
# ---------------------------------------------------------------------------

@st.fragment
def render_analysis_tab_v2() -> None:
    """分析ダッシュボード v2 エントリーポイント"""
    # 既存テーマ CSS を継承
    css_path = Path(__file__).parent / "_theme_classic.css"
    if css_path.exists():
        st.markdown(
            f"<style>{css_path.read_text(encoding='utf-8')}</style>",
            unsafe_allow_html=True,
        )

    st.subheader("📊 分析ダッシュボード v2")

    # ベースデータ（削除済み除外、10分キャッシュ）
    df_base = _load_data(include_deleted=False)

    if df_base.empty:
        st.warning("⚠ データがありません。ファイルをスキャンしてください。")
        return

    # 4タブ
    tab_ov, tab_tr, tab_cp, tab_rk = st.tabs(
        ["📋 概要", "📈 推移", "📦 構成", "🏆 ランキング"]
    )

    with tab_ov:
        _render_tab_overview(df_base)

    with tab_tr:
        _render_tab_trends(df_base)

    with tab_cp:
        _render_tab_composition(df_base)

    with tab_rk:
        _render_tab_ranking(df_base)
