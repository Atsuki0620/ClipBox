"""
Analytics support functions for the Analysis tab.

This module stays UI-agnostic: it provides data loading, filtering,
period conversion, and ranking helpers that can be reused from Streamlit
components without embedding any rendering logic.
"""

from __future__ import annotations

from datetime import date, datetime, timedelta
from pathlib import Path
from sqlite3 import Connection
from typing import Dict, Iterable, Literal, Optional, Sequence, Tuple

import pandas as pd

from core.database import get_db_connection
from core.viewing import VIEWING_METHOD_APP_PLAYBACK

_SQLITE_MAX_VARS = 900  # SQLite の SQLITE_LIMIT_VARIABLE_NUMBER 上限余裕込み


def _run_chunked_query(
    conn,
    base_query: str,
    video_ids: list,
    extra_params: list | None = None,
) -> list[dict]:
    """video_ids を 900 件ずつに分割してクエリを実行し結果を結合する。

    base_query の ``{placeholders}`` が IN 句のプレースホルダに置換される。
    extra_params は各チャンクの IN 句パラメータより前に渡されるパラメータ。

    NOTE: 複数チャンクにまたがる場合、結果の順序はチャンク内の ORDER BY のみ
    保証される。チャンク間の順序は保証されないため、呼び出し側で再ソートすること。
    """
    extra_params = extra_params or []
    results: list[dict] = []
    if not video_ids:
        return results
    for i in range(0, len(video_ids), _SQLITE_MAX_VARS):
        chunk = video_ids[i : i + _SQLITE_MAX_VARS]
        placeholders = ",".join("?" * len(chunk))
        query = base_query.format(placeholders=placeholders)
        rows = conn.execute(query, [*extra_params, *chunk]).fetchall()
        results.extend([dict(row) for row in rows])
    return results


AvailabilityFilter = Literal["利用可能のみ", "利用不可のみ", "すべて"]
PeriodPreset = Literal["全期間", "直近7日", "直近30日", "直近90日", "直近180日", "カスタム"]


def get_kpi_stats(conn: Connection) -> Dict[str, float]:
    """
    Tier1 KPI 統計を取得する（未判定数・判定済み数・判定率・本日の判定数）。

    UI 非依存の純 SQL 集計。FastAPI からは app_service.get_kpi_stats() 経由で呼ぶ。
    （旧 ui/components/kpi_display.py から移設。表示用 render_* は UI 層に残す）
    """
    # 未判定数（内部値 -1、利用可能、未削除、セレクションフォルダを除く）
    unrated_count = conn.execute(
        """
        SELECT COUNT(*)
          FROM videos
         WHERE current_favorite_level = -1
           AND is_available = 1
           AND is_deleted = 0
           AND needs_selection = 0
           AND is_selection_completed = 0
        """
    ).fetchone()[0]

    # 判定済み数（Lv0以上、利用可能、未削除、セレクションフォルダを除く）
    judged_count = conn.execute(
        """
        SELECT COUNT(*)
          FROM videos
         WHERE current_favorite_level >= 0
           AND is_available = 1
           AND is_deleted = 0
           AND needs_selection = 0
           AND is_selection_completed = 0
        """
    ).fetchone()[0]

    total = unrated_count + judged_count
    judged_rate = (judged_count / total * 100) if total else 0.0

    # 本日の判定数（judgment_history が無い場合は 0 とする）
    try:
        today_judged_count = conn.execute(
            """
            SELECT COUNT(DISTINCT video_id)
              FROM judgment_history
             WHERE DATE(judged_at) = DATE('now','localtime')
               AND was_selection_judgment = 0
            """
        ).fetchone()[0]
    except Exception:
        today_judged_count = 0

    return {
        "unrated_count": int(unrated_count),
        "judged_count": int(judged_count),
        "judged_rate": float(judged_rate),
        "today_judged_count": int(today_judged_count),
    }


def load_analysis_data(is_deleted_filter: Optional[int]) -> pd.DataFrame:
    """
    videos と viewing_history を結合し、累計視聴回数付きの DataFrame を返す。

    Args:
        is_deleted_filter: 0 を指定すると削除済みを除外、None なら全件を対象。

    Returns:
        pandas.DataFrame: 動画行＋ total_view_count / last_viewed_at 付き
    """
    query = """
    SELECT
        v.*,
        COALESCE(COUNT(vh.id), 0) AS total_view_count,
        MAX(vh.viewed_at) AS last_viewed_at
      FROM videos v
      LEFT JOIN viewing_history vh
        ON v.id = vh.video_id AND vh.viewing_method = ?
    """
    params: list = [VIEWING_METHOD_APP_PLAYBACK]

    if is_deleted_filter is not None:
        query += " WHERE v.is_deleted = ?"
        params.append(is_deleted_filter)

    query += " GROUP BY v.id"

    with get_db_connection() as conn:
        df = pd.read_sql_query(query, conn, params=params)

    if df.empty:
        return df

    # 型を明示しておくと後段のフィルタがシンプルになる
    for col in ("is_available", "is_deleted", "total_view_count"):
        if col in df.columns:
            df[col] = df[col].fillna(0).astype(int)

    return df


def apply_scope_filter(df: pd.DataFrame, availability_filter: AvailabilityFilter) -> pd.DataFrame:
    """is_available に基づくスコープフィルタを適用する。"""
    if df.empty:
        return df

    if availability_filter == "利用可能のみ":
        return df[df["is_available"] == 1]
    if availability_filter == "利用不可のみ":
        return df[df["is_available"] == 0]
    return df


def convert_period_filter(
    period_preset: PeriodPreset,
    custom_range: Optional[Tuple[date, date]] = None,
) -> Tuple[Optional[datetime], Optional[datetime]]:
    """
    プリセット/カスタムの期間指定を datetime 範囲に変換する。

    Returns:
        (period_start, period_end) 両方 None なら全期間。
    Raises:
        ValueError: 未知のプリセット、またはカスタム範囲が逆転している場合。
    """
    if period_preset == "全期間":
        return None, None

    if period_preset == "カスタム":
        if custom_range is None or len(custom_range) != 2:
            return None, None
        start_date, end_date = custom_range
        if start_date > end_date:
            raise ValueError("開始日は終了日以前で指定してください。")
        period_start = datetime.combine(start_date, datetime.min.time())
        period_end = datetime.combine(end_date, datetime.max.time())
        return period_start, period_end

    days_map = {
        "直近7日": 7,
        "直近30日": 30,
        "直近90日": 90,
        "直近180日": 180,
    }
    if period_preset not in days_map:
        raise ValueError(f"未知の期間プリセットです: {period_preset}")

    period_end = datetime.now()
    period_start = period_end - timedelta(days=days_map[period_preset])
    return period_start, period_end


def calculate_period_view_count(
    df: pd.DataFrame,
    period_start: Optional[datetime],
    period_end: Optional[datetime],
) -> pd.DataFrame:
    """
    期間内視聴回数 (period_view_count) を付与した DataFrame を返す。
    全期間指定なら total_view_count をそのまま使用する。
    """
    df_result = df.copy()

    if df_result.empty:
        df_result["period_view_count"] = 0
        return df_result

    if period_start is None and period_end is None:
        df_result["period_view_count"] = df_result["total_view_count"].fillna(0).astype(int)
        return df_result

    video_ids: list[int] = df_result["id"].tolist()
    if not video_ids:
        df_result["period_view_count"] = 0
        return df_result

    base_query = """
        SELECT video_id, COUNT(*) AS period_view_count
         FROM viewing_history
         WHERE viewed_at BETWEEN ? AND ?
           AND viewing_method = ?
           AND video_id IN ({placeholders})
         GROUP BY video_id
    """
    with get_db_connection() as conn:
        rows = _run_chunked_query(
            conn,
            base_query,
            video_ids,
            [period_start, period_end, VIEWING_METHOD_APP_PLAYBACK],
        )
    df_period = (
        pd.DataFrame(rows)
        if rows
        else pd.DataFrame(columns=["video_id", "period_view_count"])
    )

    df_result = df_result.merge(df_period, left_on="id", right_on="video_id", how="left")
    df_result["period_view_count"] = df_result["period_view_count"].fillna(0).astype(int)
    if "video_id" in df_result.columns:
        df_result = df_result.drop(columns=["video_id"])

    return df_result


def get_viewing_history(
    period_start: Optional[datetime],
    period_end: Optional[datetime],
    video_ids: Sequence[int],
) -> pd.DataFrame:
    """期間・対象動画で絞った viewing_history を返す。"""
    if not video_ids:
        return pd.DataFrame(columns=["video_id", "viewed_at"])

    base_query = "SELECT video_id, viewed_at FROM viewing_history WHERE 1=1"
    extra_params: list = []

    if period_start is not None:
        base_query += " AND viewed_at >= ?"
        extra_params.append(period_start)
    if period_end is not None:
        base_query += " AND viewed_at <= ?"
        extra_params.append(period_end)

    base_query += " AND video_id IN ({placeholders})"

    with get_db_connection() as conn:
        rows = _run_chunked_query(conn, base_query, list(video_ids), extra_params)

    if not rows:
        return pd.DataFrame(columns=["video_id", "viewed_at"])
    return pd.DataFrame(rows).sort_values("viewed_at").reset_index(drop=True)


def get_judgment_history(
    period_start: Optional[datetime],
    period_end: Optional[datetime],
    video_ids: Sequence[int],
) -> pd.DataFrame:
    """期間・対象動画で絞った judgment_history を返す。"""
    if not video_ids:
        return pd.DataFrame(columns=["video_id", "judged_at"])

    base_query = "SELECT video_id, judged_at FROM judgment_history WHERE 1=1"
    extra_params: list = []

    if period_start is not None:
        base_query += " AND judged_at >= ?"
        extra_params.append(period_start)
    if period_end is not None:
        base_query += " AND judged_at <= ?"
        extra_params.append(period_end)

    base_query += " AND video_id IN ({placeholders})"

    with get_db_connection() as conn:
        rows = _run_chunked_query(conn, base_query, list(video_ids), extra_params)

    if not rows:
        return pd.DataFrame(columns=["video_id", "judged_at"])
    return pd.DataFrame(rows).sort_values("judged_at").reset_index(drop=True)


def _bucket_label_expr(col: str, bucket: str) -> str:
    """日時列 col をバケット単位のラベル文字列に変換する SQL 式を返す。

    既存フロント（selection-trend の client 集計）と表示ラベルを揃える:
      day=YYYY-MM-DD / week=月曜開始日(YYYY-MM-DD) / month=YYYY-MM。
    col は内部固定文字列のみ（ユーザー入力を渡さない）。
    """
    if bucket == "month":
        return f"strftime('%Y-%m', {col}, 'localtime')"
    if bucket == "week":
        # 月曜開始日。%w は 0=日..6=土。(w+6)%7 日戻すと月曜になる。
        return (
            f"date({col}, 'localtime', '-' || "
            f"((cast(strftime('%w', {col}, 'localtime') as integer) + 6) % 7) || ' days')"
        )
    return f"DATE({col}, 'localtime')"  # day


def _trend_filters(
    date_col: str,
    period_start: Optional[datetime],
    period_end: Optional[datetime],
    is_available: Optional[bool],
    include_deleted: bool,
) -> Tuple[str, list]:
    """videos スコープ（可用性/論理削除）+ 期間の WHERE 句と params を組み立てる。"""
    clause = ""
    params: list = []
    if not include_deleted:
        clause += " AND v.is_deleted = 0"
    if is_available is not None:
        clause += " AND v.is_available = ?"
        params.append(1 if is_available else 0)
    if period_start is not None:
        clause += f" AND {date_col} >= ?"
        params.append(period_start)
    if period_end is not None:
        clause += f" AND {date_col} <= ?"
        params.append(period_end)
    return clause, params


def get_viewing_trend(
    period_start: Optional[datetime],
    period_end: Optional[datetime],
    is_available: Optional[bool],
    include_deleted: bool,
    bucket: str = "day",
) -> pd.DataFrame:
    """視聴回数のバケット別推移を返す（videos と JOIN し scope 済み・SQL 集計）。

    Returns:
        DataFrame: columns = ["label", "count"]（count = 視聴イベント数）
    """
    label = _bucket_label_expr("vh.viewed_at", bucket)
    where, params = _trend_filters(
        "vh.viewed_at", period_start, period_end, is_available, include_deleted
    )
    where += " AND vh.viewing_method = ?"
    params.append(VIEWING_METHOD_APP_PLAYBACK)
    query = (
        f"SELECT {label} AS label, COUNT(*) AS count"
        f" FROM viewing_history vh JOIN videos v ON v.id = vh.video_id"
        f" WHERE 1=1{where}"
        f" GROUP BY label ORDER BY label"
    )
    with get_db_connection() as conn:
        return pd.read_sql_query(query, conn, params=params)


def get_judgment_trend(
    period_start: Optional[datetime],
    period_end: Optional[datetime],
    is_available: Optional[bool],
    include_deleted: bool,
    bucket: str = "day",
    tier: Optional[int] = None,
) -> pd.DataFrame:
    """判定のバケット別推移を返す（バケットごとに COUNT(DISTINCT video_id)・SQL 集計）。

    週/月でも同一動画はバケット内で1カウントになる（client 側合算では過大計上になるため SQL で distinct）。
    tier=1 は Tier1 判定、tier=2 は Tier2 選別判定だけに絞る。None は既存どおり両方を含む。

    Returns:
        DataFrame: columns = ["label", "count"]
    """
    label = _bucket_label_expr("jh.judged_at", bucket)
    where, params = _trend_filters(
        "jh.judged_at", period_start, period_end, is_available, include_deleted
    )
    if tier == 1:
        where += " AND jh.was_selection_judgment = 0"
    elif tier == 2:
        where += " AND jh.was_selection_judgment = 1"
    query = (
        f"SELECT {label} AS label, COUNT(DISTINCT jh.video_id) AS count"
        f" FROM judgment_history jh JOIN videos v ON v.id = jh.video_id"
        f" WHERE 1=1{where}"
        f" GROUP BY label ORDER BY label"
    )
    with get_db_connection() as conn:
        return pd.read_sql_query(query, conn, params=params)


def get_likes_trend(
    period_start: Optional[datetime],
    period_end: Optional[datetime],
    is_available: Optional[bool],
    include_deleted: bool,
    bucket: str = "day",
    conn: Optional[Connection] = None,
) -> pd.DataFrame:
    """いいね数のバケット別推移を返す（likes.liked_at 基準・videos JOIN・SQL 集計）。

    Returns:
        DataFrame: columns = ["label", "count"]
    """
    label = _bucket_label_expr("l.liked_at", bucket)
    where, params = _trend_filters(
        "l.liked_at", period_start, period_end, is_available, include_deleted
    )
    query = (
        f"SELECT {label} AS label, COUNT(*) AS count"
        f" FROM likes l JOIN videos v ON v.id = l.video_id"
        f" WHERE 1=1{where}"
        f" GROUP BY label ORDER BY label"
    )

    if conn is not None:
        return pd.read_sql_query(query, conn, params=params)

    with get_db_connection() as local_conn:
        return pd.read_sql_query(query, local_conn, params=params)


def get_view_count_ranking(df_filtered: pd.DataFrame, top_n: int = 50) -> pd.DataFrame:
    """period_view_count を用いたランキング DataFrame を返す。"""
    if df_filtered.empty:
        return pd.DataFrame(
            columns=["順位", "ファイル名", "利用可否", "保存場所", "ファイル作成日", "お気に入りレベル", "視聴回数"]
        )

    ranking = df_filtered.nlargest(top_n, "period_view_count").copy()
    ranking.insert(0, "順位", range(1, len(ranking) + 1))

    def _display_name(row) -> str:
        if row.get("current_full_path"):
            return Path(row["current_full_path"]).name
        return row.get("essential_filename", "")

    ranking["ファイル名"] = ranking.apply(_display_name, axis=1)
    availability_series = ranking.get("is_available", pd.Series([None] * len(ranking)))
    ranking["利用可否"] = availability_series.map({1: "利用可", 0: "利用不可"}).fillna("不明")

    storage_series = ranking.get("storage_location", pd.Series([None] * len(ranking)))
    ranking["保存場所"] = storage_series.fillna("")

    created_series = ranking.get("file_created_at", pd.Series([None] * len(ranking)))
    ranking["ファイル作成日"] = (
        pd.to_datetime(created_series, errors="coerce").dt.strftime("%Y-%m-%d").fillna("-")
    )
    ranking["お気に入りレベル"] = ranking["current_favorite_level"]
    ranking["視聴回数"] = ranking["period_view_count"]

    return ranking[
        ["順位", "ファイル名", "利用可否", "保存場所", "ファイル作成日", "お気に入りレベル", "視聴回数"]
    ]


def get_like_count_ranking(
    df_filtered: pd.DataFrame,
    period_start: Optional[datetime] = None,
    period_end: Optional[datetime] = None,
    top_n: int = 50,
) -> pd.DataFrame:
    """いいね数ランキング DataFrame を返す。

    period_start / period_end を渡すと likes.liked_at をその期間で絞る。
    いずれも None（既定）なら全期間累計（後方互換）。
    """
    if df_filtered.empty:
        return pd.DataFrame(
            columns=["順位", "ファイル名", "利用可否", "保存場所", "ファイル作成日", "お気に入りレベル", "いいね数"]
        )

    video_ids = df_filtered["id"].tolist()
    if not video_ids:
        return pd.DataFrame(
            columns=["順位", "ファイル名", "利用可否", "保存場所", "ファイル作成日", "お気に入りレベル", "いいね数"]
        )

    # likesテーブルから動画別いいね数を集計（任意で liked_at の期間で絞る）
    # NOTE: _run_chunked_query は extra_params を IN 句のチャンクより前に渡すため、
    #       期間条件は SQL 上 IN 句より前に置く。
    period_conditions: list = []
    extra_params: list = []
    if period_start is not None:
        period_conditions.append("liked_at >= ?")
        extra_params.append(period_start)
    if period_end is not None:
        period_conditions.append("liked_at <= ?")
        extra_params.append(period_end)
    where_period = (" AND ".join(period_conditions) + " AND ") if period_conditions else ""
    base_query = f"""
        SELECT video_id, COUNT(*) AS like_count
          FROM likes
         WHERE {where_period}video_id IN ({{placeholders}})
         GROUP BY video_id
    """
    with get_db_connection() as conn:
        rows = _run_chunked_query(conn, base_query, video_ids, extra_params)
    df_likes = (
        pd.DataFrame(rows)
        if rows
        else pd.DataFrame(columns=["video_id", "like_count"])
    )

    if df_likes.empty:
        return pd.DataFrame(
            columns=["順位", "ファイル名", "利用可否", "保存場所", "ファイル作成日", "お気に入りレベル", "いいね数"]
        )

    df_likes = df_likes.rename(columns={"video_id": "id"})
    df_likes["like_count"] = df_likes["like_count"].fillna(0).astype(int)

    # df_filteredとマージ
    ranking_base = df_filtered.merge(df_likes, on="id", how="left")
    ranking_base["like_count"] = ranking_base["like_count"].fillna(0).astype(int)

    # いいね数が1以上の動画のみフィルタ
    ranking_base = ranking_base[ranking_base["like_count"] > 0]

    if ranking_base.empty:
        return pd.DataFrame(
            columns=["順位", "ファイル名", "利用可否", "保存場所", "ファイル作成日", "お気に入りレベル", "いいね数"]
        )

    # Top N抽出
    ranking = ranking_base.nlargest(top_n, "like_count").copy()
    ranking.insert(0, "順位", range(1, len(ranking) + 1))

    def _display_name(row) -> str:
        if row.get("current_full_path"):
            return Path(row["current_full_path"]).name
        return row.get("essential_filename", "")

    ranking["ファイル名"] = ranking.apply(_display_name, axis=1)
    availability_series = ranking.get("is_available", pd.Series([None] * len(ranking)))
    ranking["利用可否"] = availability_series.map({1: "利用可", 0: "利用不可"}).fillna("不明")

    storage_series = ranking.get("storage_location", pd.Series([None] * len(ranking)))
    ranking["保存場所"] = storage_series.fillna("")

    created_series = ranking.get("file_created_at", pd.Series([None] * len(ranking)))
    ranking["ファイル作成日"] = (
        pd.to_datetime(created_series, errors="coerce").dt.strftime("%Y-%m-%d").fillna("-")
    )
    ranking["お気に入りレベル"] = ranking["current_favorite_level"]
    ranking["いいね数"] = ranking["like_count"]

    return ranking[
        ["順位", "ファイル名", "利用可否", "保存場所", "ファイル作成日", "お気に入りレベル", "いいね数"]
    ]


def get_selection_judgment_trend(
    period_start: Optional[datetime],
    period_end: Optional[datetime],
) -> pd.DataFrame:
    """
    セレクション判定数の日別推移を返す。

    Returns:
        DataFrame: columns = ["date", "count"]
    """
    query = """
        SELECT DATE(judged_at, 'localtime') AS date, COUNT(*) AS count
          FROM judgment_history
         WHERE was_selection_judgment = 1
    """
    params: list = []
    if period_start is not None:
        query += " AND judged_at >= ?"
        params.append(period_start)
    if period_end is not None:
        query += " AND judged_at <= ?"
        params.append(period_end)
    query += " GROUP BY DATE(judged_at, 'localtime') ORDER BY date"

    with get_db_connection() as conn:
        df = pd.read_sql_query(query, conn, params=params)

    return df


def get_selection_level_distribution() -> pd.DataFrame:
    """
    セレクション判定結果のレベル別分布を返す。

    Returns:
        DataFrame: columns = ["level", "count"]
    """
    query = """
        SELECT new_level AS level, COUNT(*) AS count
          FROM judgment_history
         WHERE was_selection_judgment = 1
         GROUP BY new_level
         ORDER BY new_level DESC
    """
    with get_db_connection() as conn:
        return pd.read_sql_query(query, conn)


def get_view_days_ranking(
    df_filtered: pd.DataFrame,
    period_start: Optional[datetime],
    period_end: Optional[datetime],
    top_n: int = 50,
) -> pd.DataFrame:
    """指定期間に「何日視聴されたか」で集計したランキングを返す。"""
    if df_filtered.empty:
        return pd.DataFrame(
            columns=["順位", "ファイル名", "利用可否", "保存場所", "ファイル作成日", "お気に入りレベル", "視聴日数"]
        )

    video_ids = df_filtered["id"].tolist()
    if not video_ids:
        return pd.DataFrame(
            columns=["順位", "ファイル名", "利用可否", "保存場所", "ファイル作成日", "お気に入りレベル", "視聴日数"]
        )

    base_query = """
        SELECT video_id, COUNT(DISTINCT DATE(viewed_at)) AS view_days
          FROM viewing_history
         WHERE viewing_method = ?
    """
    extra_params: list = [VIEWING_METHOD_APP_PLAYBACK]

    if period_start is not None:
        base_query += " AND viewed_at >= ?"
        extra_params.append(period_start)
    if period_end is not None:
        base_query += " AND viewed_at <= ?"
        extra_params.append(period_end)

    base_query += " AND video_id IN ({placeholders}) GROUP BY video_id"

    with get_db_connection() as conn:
        rows = _run_chunked_query(conn, base_query, video_ids, extra_params)
    df_days = (
        pd.DataFrame(rows)
        if rows
        else pd.DataFrame(columns=["video_id", "view_days"])
    )

    df_days = df_days.rename(columns={"video_id": "id"})
    df_days["view_days"] = df_days["view_days"].fillna(0).astype(int)

    ranking_base = df_filtered.merge(df_days, on="id", how="left")
    ranking_base["view_days"] = ranking_base["view_days"].fillna(0).astype(int)

    ranking = ranking_base.nlargest(top_n, "view_days").copy()
    ranking.insert(0, "順位", range(1, len(ranking) + 1))

    def _display_name(row) -> str:
        if row.get("current_full_path"):
            return Path(row["current_full_path"]).name
        return row.get("essential_filename", "")

    ranking["ファイル名"] = ranking.apply(_display_name, axis=1)
    availability_series = ranking.get("is_available", pd.Series([None] * len(ranking)))
    ranking["利用可否"] = availability_series.map({1: "利用可", 0: "利用不可"}).fillna("不明")

    storage_series = ranking.get("storage_location", pd.Series([None] * len(ranking)))
    ranking["保存場所"] = storage_series.fillna("")

    created_series = ranking.get("file_created_at", pd.Series([None] * len(ranking)))
    ranking["ファイル作成日"] = (
        pd.to_datetime(created_series, errors="coerce").dt.strftime("%Y-%m-%d").fillna("-")
    )
    ranking["お気に入りレベル"] = ranking["current_favorite_level"]
    ranking["視聴日数"] = ranking["view_days"]

    return ranking[
        ["順位", "ファイル名", "利用可否", "保存場所", "ファイル作成日", "お気に入りレベル", "視聴日数"]
    ]


def _df_row_to_video(row) -> "Video":
    """pandas DataFrame の行から Video オブジェクトを生成"""
    from core.models import Video

    def _dt(val):
        if val is None:
            return None
        try:
            return pd.to_datetime(val).to_pydatetime()
        except Exception:
            return None

    return Video(
        id=int(row["id"]) if row["id"] is not None else None,
        essential_filename=row.get("essential_filename", ""),
        current_full_path=row.get("current_full_path", ""),
        current_favorite_level=int(row.get("current_favorite_level", -1)),
        file_size=int(row["file_size"]) if row.get("file_size") is not None else None,
        performer=row.get("performer"),
        storage_location=row.get("storage_location", "C_DRIVE"),
        last_file_modified=_dt(row.get("last_file_modified")),
        created_at=_dt(row.get("created_at")),
        last_scanned_at=_dt(row.get("last_scanned_at")),
        notes=row.get("notes"),
        file_created_at=_dt(row.get("file_created_at")),
        is_available=bool(int(row.get("is_available", 1) or 0)),
        is_deleted=bool(int(row.get("is_deleted", 0) or 0)),
        is_judging=bool(int(row.get("is_judging", 0) or 0)),
        needs_selection=bool(int(row.get("needs_selection", 0) or 0)),
        watch_later=bool(int(row.get("watch_later", 0) or 0)),
    )


_RANKING_PERIOD_DAYS = {"180日": 180, "1年": 365}

# 総合スコア係数（チューニング用定数）。
# score = int((view_days*A + likes*B) * (1 + BONUS_T1*t1 + BONUS_T2*t2) * 100)
_COMPOSITE_A = 1       # 視聴日数の重み
_COMPOSITE_B = 3       # いいね数の重み
_COMPOSITE_BONUS_T1 = 0.5  # T1 判定済みボーナス（+50%）
_COMPOSITE_BONUS_T2 = 0.3  # T2 選別済み追加ボーナス（+30%）


def get_ranked_videos_for_tab(
    ranking_type: str,
    period_label: str,
    min_level: "Optional[int]" = None,
    availability_filter: str = "利用可能のみ",
    top_n: int = 10,
) -> list:
    """
    ランキングタブ用: (Video, score) のリストを返す。
    同スコア時は last_viewed_at 降順、さらに id 昇順（タイブレーカー）。

    Args:
        ranking_type: "view_count" | "view_days" | "likes" | "composite"
        period_label: "180日" | "1年" | "全期間"
        min_level: None=フィルタなし, 3=Lv3以上, 4=Lv4のみ
        availability_filter: "利用可能のみ" | "利用不可のみ" | "すべて"
        top_n: 上位何件を返すか
    """
    from datetime import datetime, timedelta

    df = load_analysis_data(is_deleted_filter=0)
    if df.empty:
        return []

    df = apply_scope_filter(df, availability_filter)
    if min_level is not None:
        df = df[df["current_favorite_level"] >= min_level]
    if df.empty:
        return []

    # 期間計算
    if period_label == "全期間":
        period_start, period_end = None, None
    else:
        days = _RANKING_PERIOD_DAYS[period_label]
        period_end = datetime.now()
        period_start = period_end - timedelta(days=days)

    if ranking_type == "view_count":
        df = calculate_period_view_count(df, period_start, period_end)
        score_col = "period_view_count"
        df[score_col] = df[score_col].fillna(0).astype(int)

    elif ranking_type == "view_days":
        video_ids = df["id"].tolist()
        query = (
            "SELECT video_id, COUNT(DISTINCT DATE(viewed_at)) AS view_days"
            " FROM viewing_history WHERE viewing_method = ?"
        )
        params: list = [VIEWING_METHOD_APP_PLAYBACK]
        if period_start:
            query += " AND viewed_at >= ?"
            params.append(period_start)
        if period_end:
            query += " AND viewed_at <= ?"
            params.append(period_end)
        query += " AND video_id IN ({placeholders}) GROUP BY video_id"
        with get_db_connection() as conn:
            rows = _run_chunked_query(conn, query, video_ids, params)
        df_days = (
            pd.DataFrame(rows) if rows
            else pd.DataFrame(columns=["video_id", "view_days"])
        )
        df_days = df_days.rename(columns={"video_id": "id"})
        df = df.merge(df_days, on="id", how="left")
        score_col = "view_days"
        df[score_col] = df[score_col].fillna(0).astype(int)

    elif ranking_type == "likes":
        video_ids = df["id"].tolist()
        query = "SELECT video_id, COUNT(*) AS like_count FROM likes WHERE 1=1"
        params = []
        if period_start:
            query += " AND liked_at >= ?"
            params.append(period_start)
        if period_end:
            query += " AND liked_at <= ?"
            params.append(period_end)
        query += " AND video_id IN ({placeholders}) GROUP BY video_id"
        with get_db_connection() as conn:
            rows = _run_chunked_query(conn, query, video_ids, params)
        df_likes = (
            pd.DataFrame(rows) if rows
            else pd.DataFrame(columns=["video_id", "like_count"])
        )
        df_likes = df_likes.rename(columns={"video_id": "id"})
        df = df.merge(df_likes, on="id", how="left")
        score_col = "like_count"
        df[score_col] = df[score_col].fillna(0).astype(int)

    elif ranking_type == "composite":
        # 視聴日数
        video_ids = df["id"].tolist()
        q_days = (
            "SELECT video_id, COUNT(DISTINCT DATE(viewed_at)) AS view_days"
            " FROM viewing_history WHERE viewing_method = ?"
        )
        p_days: list = [VIEWING_METHOD_APP_PLAYBACK]
        if period_start:
            q_days += " AND viewed_at >= ?"
            p_days.append(period_start)
        if period_end:
            q_days += " AND viewed_at <= ?"
            p_days.append(period_end)
        q_days += " AND video_id IN ({placeholders}) GROUP BY video_id"
        with get_db_connection() as conn:
            rows_days = _run_chunked_query(conn, q_days, video_ids, p_days)
        df_days = (
            pd.DataFrame(rows_days) if rows_days
            else pd.DataFrame(columns=["video_id", "view_days"])
        ).rename(columns={"video_id": "id"})
        df = df.merge(df_days, on="id", how="left")
        df["view_days"] = df["view_days"].fillna(0).astype(int)

        # いいね数
        q_lk = "SELECT video_id, COUNT(*) AS like_count FROM likes WHERE 1=1"
        p_lk: list = []
        if period_start:
            q_lk += " AND liked_at >= ?"
            p_lk.append(period_start)
        if period_end:
            q_lk += " AND liked_at <= ?"
            p_lk.append(period_end)
        q_lk += " AND video_id IN ({placeholders}) GROUP BY video_id"
        with get_db_connection() as conn:
            rows_lk = _run_chunked_query(conn, q_lk, video_ids, p_lk)
        df_lk = (
            pd.DataFrame(rows_lk) if rows_lk
            else pd.DataFrame(columns=["video_id", "like_count"])
        ).rename(columns={"video_id": "id"})
        df = df.merge(df_lk, on="id", how="left")
        df["like_count"] = df["like_count"].fillna(0).astype(int)

        # T1/T2 フラグ（未判定は t1=0 でボーナスなしのままランキング対象）
        df["_t1"] = (df["current_favorite_level"].fillna(-1).astype(int) >= 0).astype(int)
        df["_t2"] = df["is_selection_completed"].fillna(0).astype(int)

        # ハイブリッドスコア: base * bonus * 100 整数化
        base = df["view_days"] * _COMPOSITE_A + df["like_count"] * _COMPOSITE_B
        bonus = 1 + _COMPOSITE_BONUS_T1 * df["_t1"] + _COMPOSITE_BONUS_T2 * df["_t2"]
        df["composite_score"] = (base * bonus * 100).round(0).astype(int)
        score_col = "composite_score"

    else:
        return []

    # スコア0は除外
    df = df[df[score_col] > 0]
    if df.empty:
        return []

    # タイブレーカー: score DESC → last_viewed_at DESC → id ASC
    df["_lv_dt"] = pd.to_datetime(df.get("last_viewed_at"), errors="coerce")
    df = df.sort_values(
        [score_col, "_lv_dt", "id"],
        ascending=[False, False, True],
        na_position="last",
    )
    df = df.head(top_n)

    return [(_df_row_to_video(row), int(row[score_col])) for _, row in df.iterrows()]


def get_response_time_data() -> list[dict]:
    """判定応答速度データを返す（UIから直接DB接続させないためのサービス関数）。

    Returns:
        list of dict with keys ``duration_ms`` and ``storage``
    """
    with get_db_connection() as conn:
        rows = conn.execute(
            """
            SELECT rename_duration_ms, storage_location
              FROM judgment_history
             WHERE rename_duration_ms IS NOT NULL
            """
        ).fetchall()
    return [{"duration_ms": row["rename_duration_ms"], "storage": row["storage_location"]} for row in rows]
