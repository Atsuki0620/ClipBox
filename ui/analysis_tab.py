from __future__ import annotations

from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional, Tuple

import pandas as pd
import streamlit as st
import plotly.express as px

from core import app_service
from core.database import get_db_connection

PALETTE = ["#2563eb", "#10b981", "#f97316", "#6366f1", "#e11d48", "#0891b2"]


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
        y_label = "動画数"
    else:
        data = grouped["file_size"].sum().reset_index(name="value")
        data["value"] = data["value"] / (1024**3)
        y_label = "総容量(GB)"

    fig = px.bar(
        data,
        x="current_favorite_level",
        y="value",
        color="storage_location",
        barmode="stack",
        color_discrete_sequence=PALETTE,
        labels={
            "current_favorite_level": "お気に入りレベル",
            "value": y_label,
            "storage_location": "保存先",
        },
    )
    fig.update_layout(xaxis=dict(dtick=1))
    st.plotly_chart(fig, use_container_width=True)


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
    fig = px.line(
        trend,
        x="bucket",
        y="視聴回数",
        markers=True,
        color_discrete_sequence=[PALETTE[4]],
        labels={"bucket": "期間", "視聴回数": "視聴回数"},
    )
    fig.update_layout(xaxis_tickangle=-25)
    st.plotly_chart(fig, use_container_width=True)


# 視聴済み率の円グラフは削除（保存先別テーブルに統合）


def _render_size_distribution(df_filtered: pd.DataFrame) -> None:
    st.subheader("📦 容量分布")
    if df_filtered.empty:
        st.info("容量分布を表示できるデータがありません。")
        return
    df_filtered = df_filtered.copy()
    df_filtered["file_size_gb"] = df_filtered["file_size"].fillna(0) / (1024**3)
    fig = px.histogram(
        df_filtered,
        x="file_size_gb",
        nbins=20,
        color_discrete_sequence=[PALETTE[0]],
        labels={"file_size_gb": "ファイルサイズ (GB)", "count": "本数"},
    )
    st.plotly_chart(fig, use_container_width=True)


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

    fig = px.histogram(
        dist,
        x=dist,
        nbins=max_vc - min_vc + 1,
        color_discrete_sequence=[PALETTE[5]],
        labels={"value": "視聴回数", "count": "本数"},
    )
    fig.update_xaxes(dtick=1)
    st.plotly_chart(fig, use_container_width=True)


def _render_ranking(df_filtered: pd.DataFrame) -> None:
    st.subheader("🏆 視聴回数ランキング")

    if df_filtered.empty:
        st.info("ランキングを表示できるデータがありません。")
        return

    # U3: スライダーからラジオボタンに変更
    max_n = int(df_filtered.shape[0])
    top_options = [10, 20, 50, 100]
    # データ数より大きい選択肢は除外
    valid_options = [n for n in top_options if n <= max_n]
    if not valid_options:
        valid_options = [max_n]  # データ数が少ない場合は最大数を表示

    top_n = st.radio(
        "表示件数 (Top N)",
        options=valid_options,
        index=min(1, len(valid_options) - 1),  # 可能なら2番目（20）をデフォルト
        horizontal=True,
        key="ranking_top_n",
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


def _render_response_time_histogram() -> None:
    """判定後の応答速度ヒストグラム"""
    st.subheader("⚡ 判定応答速度")

    with get_db_connection() as conn:
        rows = conn.execute(
            """
            SELECT rename_duration_ms, storage_location
              FROM judgment_history
             WHERE rename_duration_ms IS NOT NULL
            """
        ).fetchall()

    if not rows:
        st.info("応答速度データがまだありません")
        return

    df = pd.DataFrame(rows, columns=["duration_ms", "storage"])
    df["duration_ms"] = pd.to_numeric(df["duration_ms"], errors="coerce")
    df = df.dropna(subset=["duration_ms"])

    if df.empty:
        st.info("応答速度データがまだありません")
        return

    fig = px.histogram(
        df,
        x="duration_ms",
        color="storage",
        nbins=20,
        title="判定後の応答速度分布",
        labels={"duration_ms": "応答速度 (ms)", "storage": "保存場所"},
        hover_data={"duration_ms": True},
    )
    fig.update_layout(
        xaxis_title="応答速度 (ms)",
        yaxis_title="件数",
        bargap=0.1,
        legend_title="保存場所",
    )

    st.plotly_chart(fig, use_container_width=True)

    st.write("**統計情報**")
    col1, col2, col3, col4 = st.columns(4)
    with col1:
        st.metric("平均", f"{df['duration_ms'].mean():.1f}ms")
    with col2:
        st.metric("中央値", f"{df['duration_ms'].median():.1f}ms")
    with col3:
        st.metric("最大", f"{df['duration_ms'].max():.0f}ms")
    with col4:
        st.metric("最小", f"{df['duration_ms'].min():.0f}ms")


@st.fragment
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
    _render_response_time_histogram()
    st.markdown('</div>', unsafe_allow_html=True)

    st.markdown('<div class="chart-card animate-in animate-in-delay-2">', unsafe_allow_html=True)
    _render_ranking(df_filtered)
    st.markdown('</div>', unsafe_allow_html=True)
