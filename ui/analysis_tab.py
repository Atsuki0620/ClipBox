from __future__ import annotations

from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional, Tuple

import matplotlib.pyplot as plt
import matplotlib as mpl
import pandas as pd
import streamlit as st
import seaborn as sns
import japanize_matplotlib  # noqa: F401

from core import app_service

# seaborn 共通スタイル
PALETTE = ["#2563eb", "#10b981", "#f97316", "#6366f1", "#e11d48", "#0891b2"]
sns.set_theme(style="whitegrid", palette=PALETTE, font="sans-serif", font_scale=1.05)
mpl.rcParams["font.family"] = "IPAexGothic"


def _annotate_bars(ax):
    """Barplotに値ラベルを付与"""
    for p in ax.patches:
        value = p.get_height()
        ax.annotate(
            f"{value:.0f}",
            (p.get_x() + p.get_width() / 2, value),
            ha="center",
            va="bottom",
            fontsize=10,
            color="#374151",
        )

@st.cache_data(ttl=600)
def _load_cached_analysis_data(include_deleted: bool) -> pd.DataFrame:
    """削除済み有無だけをキーにしたデータ読み込み（10分キャッシュ）。"""
    is_deleted_filter = None if include_deleted else 0
    return app_service.load_analysis_data(is_deleted_filter)


def _render_filters() -> tuple[str, bool, str, Optional[Tuple]]:
    """フィルタコントロール領域"""
    st.markdown('<div class="filter-panel animate-in">', unsafe_allow_html=True)
    col1, col2, col3 = st.columns(3)

    with col1:
        availability = st.selectbox(
            "利用可能性",
            options=["利用可能のみ", "利用不可のみ", "すべて"],
            index=2,  # 既定は「すべて」
        )

    with col2:
        include_deleted = st.checkbox("削除済みを含む", value=False)

    with col3:
        period_preset = st.selectbox(
            "期間",
            options=["全期間", "直近7日", "直近30日", "直近90日", "直近180日", "カスタム"],
            index=0,
        )

    custom_range = None
    if period_preset == "カスタム":
        default_start = datetime.now().date() - timedelta(days=30)
        default_end = datetime.now().date()
        custom_range = st.date_input(
            "期間を指定",
            value=(default_start, default_end),
            max_value=datetime.now().date(),
        )
    st.markdown('</div>', unsafe_allow_html=True)

    return availability, include_deleted, period_preset, custom_range


def _render_kpis(df_filtered: pd.DataFrame) -> None:
    """KPI サマリー表示"""
    total_videos = len(df_filtered)
    total_size_gb = df_filtered["file_size"].fillna(0).sum() / (1024**3)
    viewed_videos = (df_filtered["total_view_count"] > 0).sum()
    unviewed_videos = (df_filtered["total_view_count"] == 0).sum()
    period_view_count = df_filtered["period_view_count"].sum()

    col1, col2, col3, col4, col5 = st.columns(5, gap="medium")

    def show_kpi(col, label, value, delay):
        with col:
            col.markdown(
                f'''<div class="kpi-card animate-in animate-in-delay-{delay}">
                    <div class="kpi-label">{label}</div>
                    <div class="kpi-value">{value}</div>
                </div>''',
                unsafe_allow_html=True
            )

    show_kpi(col1, "総動画数", f"{total_videos:,} 本", 1)
    show_kpi(col2, "総容量", f"{total_size_gb:,.2f} GB", 2)
    show_kpi(col3, "視聴済み", f"{viewed_videos:,} 本", 3)
    show_kpi(col4, "未視聴", f"{unviewed_videos:,} 本", 4)
    show_kpi(col5, "期間内総視聴回数", f"{period_view_count:,} 回", 5)


def _render_level_chart(df_filtered: pd.DataFrame) -> None:
    """レベル別動画数/総容量をラジオで切替える積上げ棒グラフ。"""

    storage_palette = {"C_DRIVE": PALETTE[0], "EXTERNAL_HDD": PALETTE[1]}

    st.subheader("📊 レベル別集計")
    metric = st.radio(
        "表示項目",
        options=["動画本数", "総容量(GB)"],
        horizontal=True,
        index=0,
    )

    grouped = df_filtered.groupby(["current_favorite_level", "storage_location"])
    if metric == "動画本数":
        data = grouped.size().reset_index(name="value")
        ylabel = "動画数"
        formatter = lambda v: f"{int(v)}"
    else:
        data = grouped["file_size"].sum().reset_index(name="value")
        data["value"] = data["value"] / (1024**3)
        ylabel = "総容量 (GB)"
        formatter = lambda v: f"{v:.1f}"

    pivot = (
        data.pivot(index="current_favorite_level", columns="storage_location", values="value")
        .fillna(0)
    )

    # 列順を固定（存在しない列は自動除外）
    ordered_cols = [c for c in ["C_DRIVE", "EXTERNAL_HDD"] if c in pivot.columns]
    pivot = pivot[ordered_cols]
    pivot = pivot.sort_index()

    colors = [storage_palette.get(col, "#9ca3af") for col in pivot.columns]

    fig, ax = plt.subplots(figsize=(11, 5.8))
    pivot.plot(
        kind="bar",
        stacked=True,
        ax=ax,
        color=colors,
        width=0.72,
        edgecolor="#e5e7eb",
    )

    ax.set_xlabel("お気に入りレベル")
    ax.set_ylabel(ylabel)
    ax.set_xticklabels(ax.get_xticklabels(), rotation=0)
    ax.legend(title="保存先", loc="upper right")
    sns.despine(ax=ax, right=True, top=True)

    totals = pivot.sum(axis=1)
    offset = totals.max() * 0.03 if totals.max() else 0.2
    for idx, total in enumerate(totals):
        ax.text(
            idx,
            total + offset,
            formatter(total),
            ha="center",
            va="bottom",
            fontsize=12,
            color="#374151",
        )

    st.pyplot(fig, clear_figure=True)


def _render_storage_charts(df_filtered: pd.DataFrame) -> None:
    storage_table = (
        df_filtered.groupby("storage_location")
        .agg(
            動画数=("id", "size"),
            容量_GB=("file_size", lambda s: round(s.fillna(0).sum() / (1024**3), 2)),
            視聴済み=("total_view_count", lambda x: (x > 0).sum()),
        )
        .reset_index()
        .rename(columns={"storage_location": "保存場所", "容量_GB": "容量(GB)"})
    )

    # 視聴済み率を計算
    storage_table["視聴済み率"] = (
        (storage_table["視聴済み"] / storage_table["動画数"] * 100)
        .round(1)
        .astype(str) + "%"
    )

    preferred_order = ["C_DRIVE", "EXTERNAL_HDD"]
    storage_table["sort_key"] = storage_table["保存場所"].apply(
        lambda loc: preferred_order.index(loc) if loc in preferred_order else len(preferred_order)
    )
    storage_table = storage_table.sort_values(["sort_key", "保存場所"]).drop(columns="sort_key")

    st.subheader("💿 保存先別 動画数・総容量")
    st.dataframe(
        storage_table,
        use_container_width=True,
        hide_index=True,
        height=140,
    )


def _render_trend_chart(
    df_filtered: pd.DataFrame,
    period_start: Optional[datetime],
    period_end: Optional[datetime],
) -> None:
    st.subheader("📈 視聴回数の推移")
    granularity = st.radio(
        "集計粒度",
        options=["日別", "週別", "月別"],
        horizontal=True,
    )

    views_df = app_service.get_viewing_history(
        period_start=period_start,
        period_end=period_end,
        video_ids=df_filtered["id"].tolist(),
    )

    if views_df.empty:
        st.info("指定期間内の視聴履歴がありません。")
        return

    views_df["viewed_at"] = pd.to_datetime(views_df["viewed_at"])

    if granularity == "日別":
        views_df["bucket"] = views_df["viewed_at"].dt.date
    elif granularity == "週別":
        views_df["bucket"] = views_df["viewed_at"].dt.to_period("W").apply(lambda p: p.start_time.date())
    else:
        views_df["bucket"] = views_df["viewed_at"].dt.to_period("M").apply(lambda p: p.start_time.date())

    trend = views_df.groupby("bucket").size().reset_index(name="視聴回数")
    fig, ax = plt.subplots(figsize=(5.5, 2.8))
    sns.lineplot(data=trend, x="bucket", y="視聴回数", marker="o", ax=ax, color=PALETTE[4])
    ax.set_xlabel("期間")
    ax.set_ylabel("視聴回数")
    for label in ax.get_xticklabels():
        label.set_rotation(25)
        label.set_horizontalalignment("right")
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    st.pyplot(fig, clear_figure=True)


# 視聴済み率の円グラフは削除（保存先別テーブルに統合）


def _render_size_distribution(df_filtered: pd.DataFrame) -> None:
    st.subheader("📦 容量分布")
    if df_filtered.empty:
        st.info("容量分布を表示できるデータがありません。")
        return
    df_filtered = df_filtered.copy()
    df_filtered["file_size_gb"] = df_filtered["file_size"].fillna(0) / (1024**3)
    fig, ax = plt.subplots(figsize=(5.5, 2.6))
    sns.histplot(df_filtered["file_size_gb"], bins=20, ax=ax, color=PALETTE[0])
    ax.set_xlabel("ファイルサイズ (GB)")
    ax.set_ylabel("本数")
    st.pyplot(fig, clear_figure=True)


def _render_view_count_distribution(df_filtered: pd.DataFrame) -> None:
    st.subheader("📊 視聴回数分布 (1回以上)")

    # 0回を除去
    df_viewed = df_filtered[df_filtered["period_view_count"] > 0]

    if df_viewed.empty:
        st.info("期間内に1回以上視聴された動画がありません。")
        return

    dist = df_viewed["period_view_count"]
    min_vc = int(dist.min())
    max_vc = int(dist.max())

    fig, ax = plt.subplots(figsize=(5.5, 2.6))
    sns.histplot(dist, bins=range(min_vc, max_vc + 2), ax=ax, color=PALETTE[5], discrete=True)
    ax.set_xlabel("視聴回数")
    ax.set_ylabel("本数")
    st.pyplot(fig, clear_figure=True)


def _render_ranking(df_filtered: pd.DataFrame) -> None:
    st.subheader("🏆 視聴回数ランキング")

    if df_filtered.empty:
        st.info("ランキングを表示できるデータがありません。")
        return

    max_n = int(df_filtered.shape[0])
    default_top = min(50, max_n)
    top_n = st.slider(
        "表示件数 (Top N)",
        min_value=1,
        max_value=max_n,
        value=default_top,
        step=1,
    )

    ranking_df = app_service.get_view_count_ranking(df_filtered, top_n=top_n)

    st.dataframe(
        ranking_df,
        use_container_width=True,
        height=300,
        hide_index=True,
        column_config={
            "順位": st.column_config.NumberColumn("順位", width="small"),
            "ファイル名": st.column_config.TextColumn("ファイル名", width="large"),
            "利用可否": st.column_config.TextColumn("利用可否", width="small"),
            "保存場所": st.column_config.TextColumn("保存場所", width="small"),
            "ファイル作成日": st.column_config.TextColumn("ファイル作成日", width="small"),
            "お気に入りレベル": st.column_config.NumberColumn("お気に入りレベル", width="small"),
            "視聴回数": st.column_config.NumberColumn("視聴回数", width="small"),
        },
    )


def _render_graphs(
    df_filtered: pd.DataFrame,
    period_start: Optional[datetime],
    period_end: Optional[datetime],
) -> None:
    # 左大・右小の2列レイアウト（比率 2:1）
    col_left, col_right = st.columns([2, 1], gap="medium")

    with col_left:
        # 左列: レベル別集計 + 保存先別テーブル
        _render_level_chart(df_filtered)
        _render_storage_charts(df_filtered)

    with col_right:
        # 右列: 視聴回数の推移、容量分布、視聴回数分布を縦並び
        _render_trend_chart(df_filtered, period_start, period_end)
        _render_size_distribution(df_filtered)
        _render_view_count_distribution(df_filtered)


def render_analysis_tab() -> None:
    """分析タブのエントリーポイント"""
    # 軽いテーマCSS
    st.markdown(
        f"<style>{(Path(__file__).parent / '_theme.css').read_text(encoding='utf-8')}</style>",
        unsafe_allow_html=True,
    )
    st.title("📊 分析ダッシュボード")

    availability, include_deleted, period_preset, custom_range = _render_filters()

    try:
        period_start, period_end = app_service.convert_period_filter(period_preset, custom_range)
    except ValueError as e:
        st.error(f"❗ {e}")
        return

    df_base = _load_cached_analysis_data(include_deleted)
    df_filtered = app_service.apply_scope_filter(df_base, availability)
    df_filtered = app_service.calculate_period_view_count(df_filtered, period_start, period_end)

    if df_filtered.empty:
        st.warning("⚠ 条件に合致する動画が見つかりませんでした。フィルタ条件を変更してください。")
        return

    # KPI Cards with glassmorphism
    with st.container():
        st.markdown('<div class="metrics-row">', unsafe_allow_html=True)
        _render_kpis(df_filtered)
        st.markdown('</div>', unsafe_allow_html=True)

    # Chart sections with modern card style
    st.markdown('<div class="chart-card animate-in">', unsafe_allow_html=True)
    _render_graphs(df_filtered, period_start, period_end)
    st.markdown('</div>', unsafe_allow_html=True)

    st.markdown('<div class="chart-card animate-in animate-in-delay-1">', unsafe_allow_html=True)
    _render_ranking(df_filtered)
    st.markdown('</div>', unsafe_allow_html=True)
