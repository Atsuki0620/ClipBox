from __future__ import annotations

from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional, Tuple

import pandas as pd
import streamlit as st
import plotly.express as px

from core import app_service

# 透明感のあるネオングラデーションに合わせた新パレット
PALETTE = ["#68d3ff", "#a855f7", "#22d3ee", "#f97316", "#fb7185", "#c7d2fe"]
TOP_N_OPTIONS = [10, 20, 50, 100]


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
    show_kpi(col2, "総容量", f"{total_size_gb:,.0f} GB", 2)
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
    st.plotly_chart(fig, width="stretch")


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
        width="stretch",
        hide_index=True,
        height=140,
    )


def _render_trend_chart(
    df_filtered: pd.DataFrame,
    period_start: Optional[datetime],
    period_end: Optional[datetime],
) -> None:
    header_left, header_right = st.columns([1.2, 1])
    with header_left:
        st.subheader("📈 視聴回数の推移")
    with header_right:
        granularity = st.radio(
            "集計粒度",
            options=["日別", "週別", "月別"],
            horizontal=True,
            label_visibility="collapsed",
            key="trend_granularity",
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
        labels={"視聴回数": "視聴回数"},
    )
    fig.update_layout(
        xaxis_tickangle=-25,
        height=320,
        margin=dict(t=30, b=40),
        xaxis_title="",
    )
    fig.update_xaxes(tickformat="%Y/%m/%d")
    st.plotly_chart(fig, width="stretch")


def _render_judgment_trend(
    df_filtered: pd.DataFrame,
    period_start: Optional[datetime],
    period_end: Optional[datetime],
) -> None:
    header_left, header_right = st.columns([1.2, 1])
    with header_left:
        st.subheader("🧮 判定数の推移")
    with header_right:
        granularity = st.radio(
            "判定粒度",
            options=["日別", "週別", "月別"],
            horizontal=True,
            label_visibility="collapsed",
            key="judgment_trend_granularity",
        )

    judgments_df = app_service.get_judgment_history(
        period_start=period_start,
        period_end=period_end,
        video_ids=df_filtered["id"].tolist(),
    )

    if judgments_df.empty:
        st.info("指定期間内の判定履歴がありません。")
        return

    judgments_df["judged_at"] = pd.to_datetime(judgments_df["judged_at"])

    if granularity == "日別":
        judgments_df["bucket"] = judgments_df["judged_at"].dt.date
    elif granularity == "週別":
        judgments_df["bucket"] = judgments_df["judged_at"].dt.to_period("W").apply(lambda p: p.start_time.date())
    else:
        judgments_df["bucket"] = judgments_df["judged_at"].dt.to_period("M").apply(lambda p: p.start_time.date())

    # 「本日の判定」と同じく、同一日・同一動画の重複を1件にまとめる
    judgments_df = judgments_df.drop_duplicates(subset=["video_id", "bucket"])
    trend = judgments_df.groupby("bucket").size().reset_index(name="判定数")

    fig = px.line(
        trend,
        x="bucket",
        y="判定数",
        markers=True,
        color_discrete_sequence=[PALETTE[1]],
        labels={"判定数": "判定数"},
    )
    fig.update_layout(
        xaxis_tickangle=-25,
        height=320,
        margin=dict(t=30, b=40),
        xaxis_title="",
    )
    fig.update_xaxes(tickformat="%Y/%m/%d")
    st.plotly_chart(fig, width="stretch")


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
    st.plotly_chart(fig, width="stretch")


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
    st.plotly_chart(fig, width="stretch")


def _render_ranking(df_filtered: pd.DataFrame) -> None:
    st.subheader("🏆 視聴回数ランキング")

    if df_filtered.empty:
        st.info("ランキングを表示できるデータがありません。")
        return

    max_n = int(df_filtered.shape[0])
    valid_options = [n for n in TOP_N_OPTIONS if n <= max_n]
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
        width="stretch",
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


def _render_view_days_ranking(
    df_filtered: pd.DataFrame,
    period_start: Optional[datetime],
    period_end: Optional[datetime],
) -> None:
    """視聴日数（ユニーク日数）ランキングを表示"""
    st.subheader("📅 視聴日数ランキング")

    if df_filtered.empty:
        st.info("ランキングを表示できるデータがありません。")
        return

    max_n = int(df_filtered.shape[0])
    valid_options = [n for n in TOP_N_OPTIONS if n <= max_n]
    if not valid_options:
        valid_options = [max_n]

    top_n = st.radio(
        "表示件数 (Top N)",
        options=valid_options,
        index=min(1, len(valid_options) - 1) if len(valid_options) > 1 else 0,
        horizontal=True,
        key="ranking_view_days_top_n",
    )

    ranking_df = app_service.get_view_days_ranking(
        df_filtered=df_filtered,
        period_start=period_start,
        period_end=period_end,
        top_n=top_n,
    )

    st.dataframe(
        ranking_df,
        width="stretch",
        height=300,
        hide_index=True,
        column_config={
            "順位": st.column_config.NumberColumn("順位", width="small"),
            "ファイル名": st.column_config.TextColumn("ファイル名", width="large"),
            "利用可否": st.column_config.TextColumn("利用可否", width="small"),
            "保存場所": st.column_config.TextColumn("保存場所", width="small"),
            "ファイル作成日": st.column_config.TextColumn("ファイル作成日", width="small"),
            "お気に入りレベル": st.column_config.NumberColumn("お気に入りレベル", width="small"),
            "視聴日数": st.column_config.NumberColumn("視聴日数", width="small"),
        },
    )


def _render_like_count_ranking(df_filtered: pd.DataFrame) -> None:
    """いいね数ランキングを表示"""
    st.subheader("👍 いいね数ランキング")

    if df_filtered.empty:
        st.info("ランキングを表示できるデータがありません。")
        return

    max_n = int(df_filtered.shape[0])
    valid_options = [n for n in TOP_N_OPTIONS if n <= max_n]
    if not valid_options:
        valid_options = [max_n]

    top_n = st.radio(
        "表示件数 (Top N)",
        options=valid_options,
        index=min(1, len(valid_options) - 1) if len(valid_options) > 1 else 0,
        horizontal=True,
        key="ranking_like_count_top_n",
    )

    ranking_df = app_service.get_like_count_ranking(df_filtered, top_n=top_n)

    if ranking_df.empty:
        st.info("いいねが1件も記録されていません。")
        return

    st.dataframe(
        ranking_df,
        width="stretch",
        height=300,
        hide_index=True,
        column_config={
            "順位": st.column_config.NumberColumn("順位", width="small"),
            "ファイル名": st.column_config.TextColumn("ファイル名", width="large"),
            "利用可否": st.column_config.TextColumn("利用可否", width="small"),
            "保存場所": st.column_config.TextColumn("保存場所", width="small"),
            "ファイル作成日": st.column_config.TextColumn("ファイル作成日", width="small"),
            "お気に入りレベル": st.column_config.NumberColumn("お気に入りレベル", width="small"),
            "いいね数": st.column_config.NumberColumn("いいね数", width="small"),
        },
    )


def _render_graphs(
    df_filtered: pd.DataFrame,
    period_start: Optional[datetime],
    period_end: Optional[datetime],
) -> None:
    # 1. 視聴回数の推移（全幅）
    st.markdown('<div class="chart-card animate-in">', unsafe_allow_html=True)
    _render_trend_chart(df_filtered, period_start, period_end)
    st.markdown('</div>', unsafe_allow_html=True)

    # 1b. 判定数の推移（全幅）
    st.markdown('<div class="chart-card animate-in animate-in-delay-1">', unsafe_allow_html=True)
    _render_judgment_trend(df_filtered, period_start, period_end)
    st.markdown('</div>', unsafe_allow_html=True)

    # 2. 残りグラフを左右に配置
    col_left, col_right = st.columns([2, 1.2], gap="large")

    with col_left:
        st.markdown('<div class="chart-card animate-in animate-in-delay-2">', unsafe_allow_html=True)
        _render_level_chart(df_filtered)
        _render_storage_charts(df_filtered)
        st.markdown('</div>', unsafe_allow_html=True)

    with col_right:
        st.markdown('<div class="chart-card animate-in animate-in-delay-3">', unsafe_allow_html=True)
        _render_size_distribution(df_filtered)
        st.markdown('</div>', unsafe_allow_html=True)

        st.markdown('<div class="chart-card animate-in animate-in-delay-4">', unsafe_allow_html=True)
        _render_view_count_distribution(df_filtered)
        st.markdown('</div>', unsafe_allow_html=True)


def _render_response_time_histogram() -> None:
    """判定後の応答速度ヒストグラム"""
    st.subheader("⚡ 判定応答速度")

    rows = app_service.get_response_time_data()

    if not rows:
        st.info("応答速度データがまだありません")
        return

    df = pd.DataFrame(rows)
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

    st.plotly_chart(fig, width="stretch")

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


def _render_selection_analysis(
    period_start: Optional[datetime],
    period_end: Optional[datetime],
) -> None:
    """セレクション成果分析セクション"""
    st.subheader("🎯 セレクション成果分析")

    trend_df = app_service.get_selection_judgment_trend(period_start, period_end)
    dist_df = app_service.get_selection_level_distribution()

    col_left, col_right = st.columns(2, gap="large")

    with col_left:
        header_l, header_r = st.columns([2, 1])
        with header_l:
            st.markdown("**選別数の推移**")
        with header_r:
            granularity = st.radio(
                "粒度",
                options=["日別", "週別", "月別"],
                horizontal=True,
                label_visibility="collapsed",
                key="selection_trend_granularity",
            )

        if trend_df.empty:
            st.info("セレクション判定データがありません。")
        else:
            trend_df["date"] = pd.to_datetime(trend_df["date"])
            if granularity == "週別":
                trend_df["bucket"] = trend_df["date"].dt.to_period("W").apply(lambda p: p.start_time.date())
            elif granularity == "月別":
                trend_df["bucket"] = trend_df["date"].dt.to_period("M").apply(lambda p: p.start_time.date())
            else:
                trend_df["bucket"] = trend_df["date"].dt.date

            agg = trend_df.groupby("bucket")["count"].sum().reset_index(name="選別数")
            fig = px.line(
                agg,
                x="bucket",
                y="選別数",
                markers=True,
                color_discrete_sequence=[PALETTE[4]],
                labels={"bucket": "日付", "選別数": "選別数"},
            )
            fig.update_layout(
                xaxis_tickangle=-25,
                height=300,
                margin=dict(t=20, b=40),
                xaxis_title="",
            )
            fig.update_xaxes(tickformat="%Y/%m/%d")
            st.plotly_chart(fig, width="stretch")

    with col_right:
        st.markdown("**選別結果のレベル分布**")
        if dist_df.empty:
            st.info("セレクション判定データがありません。")
        else:
            level_colors = {-1: "#9ca3af", 0: "#d1d5db", 1: "#93c5fd", 2: "#3b82f6", 3: "#2563eb", 4: "#1d4ed8"}
            dist_df["color"] = dist_df["level"].map(lambda l: level_colors.get(l, "#6b7280"))
            dist_df["level_label"] = dist_df["level"].map(
                lambda l: "未判定" if l == -1 else f"Lv{l}"
            )
            fig = px.bar(
                dist_df,
                x="level_label",
                y="count",
                color="level_label",
                color_discrete_map={row["level_label"]: row["color"] for _, row in dist_df.iterrows()},
                labels={"level_label": "レベル", "count": "選別数"},
            )
            fig.update_layout(height=300, margin=dict(t=20, b=40), showlegend=False)
            st.plotly_chart(fig, width="stretch")


@st.fragment
def render_analysis_tab() -> None:
    """分析タブのエントリーポイント"""
    # クラシックテーマを適用（切替なし）
    st.markdown(
        f"<style>{(Path(__file__).parent / '_theme_classic.css').read_text(encoding='utf-8')}</style>",
        unsafe_allow_html=True,
    )

    st.markdown(
        """
        <div class="hero-card animate-in">
          <div>
            <div class="hero-eyebrow">INSIGHTS</div>
            <h1 class="hero-title">📊 分析ダッシュボード</h1>
            <p class="hero-desc">ライブラリの健康状態と視聴動向を俯瞰できます。</p>
          </div>
        </div>
        """,
        unsafe_allow_html=True,
    )

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

    # KPI Cards
    with st.container():
        st.markdown('<div class="metrics-row">', unsafe_allow_html=True)
        _render_kpis(df_filtered)
        st.markdown('</div>', unsafe_allow_html=True)

    # グラフ群
    _render_graphs(df_filtered, period_start, period_end)

    st.markdown('<div class="chart-card animate-in animate-in-delay-2">', unsafe_allow_html=True)
    _render_response_time_histogram()
    st.markdown('</div>', unsafe_allow_html=True)

    st.markdown('<div class="chart-card animate-in animate-in-delay-3">', unsafe_allow_html=True)
    _render_ranking(df_filtered)
    st.markdown('</div>', unsafe_allow_html=True)

    st.markdown('<div class="chart-card animate-in animate-in-delay-4">', unsafe_allow_html=True)
    _render_view_days_ranking(df_filtered, period_start, period_end)
    st.markdown('</div>', unsafe_allow_html=True)

    st.markdown('<div class="chart-card animate-in animate-in-delay-5">', unsafe_allow_html=True)
    _render_like_count_ranking(df_filtered)
    st.markdown('</div>', unsafe_allow_html=True)

    st.markdown('<div class="chart-card animate-in animate-in-delay-5">', unsafe_allow_html=True)
    _render_selection_analysis(period_start, period_end)
    st.markdown('</div>', unsafe_allow_html=True)
