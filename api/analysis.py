"""
ClipBox API - 分析ダッシュボードのルーター（read）。

役割:
    分析基礎データ・視聴/判定履歴・応答時間・3種ランキング・セレクショントレンド/分布を返す。
    pandas DataFrame は `api._serialization.df_records` で JSON 安全に直列化する。

【設計制約】
- `core.app_service` のファサード経由でのみ DB にアクセスする（analysis_service は app_service 再公開）。
- 列挙パラメータ（period/availability/kind）は `Literal` で 422 に寄せる。
- ランキングは「フラット snake_case・型付き」へ正規化する（表示用文字列を漏らさない）。
- `streamlit` を import しない。

【依存関係】
api.analysis → core.app_service → core.analysis_service
api.analysis → api._serialization（DataFrame→list[dict]）, api._params（配列クエリ）, api.schemas
"""

from __future__ import annotations

from datetime import date, datetime
from typing import List, Literal, Optional

from fastapi import APIRouter, HTTPException, Query

from core import app_service
from api._params import csv_int_list
from api._serialization import df_records
from api.schemas import (
    AnalysisDataResponse,
    AnalysisRankingItem,
    AnalysisRankingResponse,
    JudgmentHistoryItem,
    ResponseTimeItem,
    SelectionDistributionItem,
    SelectionTrendItem,
    TrendItem,
    ViewingHistoryItem,
)

router = APIRouter()

PeriodPreset = Literal["全期間", "直近7日", "直近30日", "直近90日", "直近180日", "カスタム"]
Availability = Literal["利用可能のみ", "利用不可のみ", "すべて"]
RankingKind = Literal["view_count", "view_days", "likes"]
Bucket = Literal["day", "week", "month"]

_AVAIL_TO_BOOL = {"利用可": True, "利用不可": False}
# availability リテラル → videos.is_available フィルタ（None=すべて）。
_AVAIL_TO_FILTER = {"利用可能のみ": True, "利用不可のみ": False, "すべて": None}
_SCORE_COL = {"view_count": "視聴回数", "view_days": "視聴日数", "likes": "いいね数"}


def _resolve_period(period: str, start: Optional[date], end: Optional[date]):
    """period プリセット（＋カスタム範囲）を (period_start, period_end) に解決する。不正は 422。"""
    if period == "カスタム":
        if start is None or end is None:
            raise HTTPException(status_code=422, detail="period=カスタム には start と end が必要です")
        custom_range = (start, end)
    else:
        custom_range = None
    try:
        return app_service.convert_period_filter(period, custom_range)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))


def _scoped_df(period, start, end, availability, include_deleted):
    """load → scope を行い、(df, period_start, period_end) を返す。"""
    is_deleted_filter = None if include_deleted else 0
    df = app_service.load_analysis_data(is_deleted_filter)
    period_start, period_end = _resolve_period(period, start, end)
    df = app_service.apply_scope_filter(df, availability)
    return df, period_start, period_end


def _ranking_items(rdf, score_col_jp: str) -> List[AnalysisRankingItem]:
    """日本語フラット列のランキング DataFrame を型付き snake_case 項目へ正規化する（Q2）。"""
    items: List[AnalysisRankingItem] = []
    for _, row in rdf.iterrows():
        created = row.get("ファイル作成日")
        storage = row.get("保存場所")
        items.append(
            AnalysisRankingItem(
                rank=int(row["順位"]),
                filename=str(row.get("ファイル名", "")),
                is_available=_AVAIL_TO_BOOL.get(row.get("利用可否")),
                storage_location=(str(storage) if storage else None),
                file_created_at=(None if created in (None, "-", "") else str(created)),
                favorite_level=int(row.get("お気に入りレベル", -1)),
                score=int(row.get(score_col_jp, 0)),
            )
        )
    return items


@router.get("/analysis/data", response_model=AnalysisDataResponse)
def analysis_data(
    period: PeriodPreset = Query(default="全期間"),
    start: Optional[date] = Query(default=None),
    end: Optional[date] = Query(default=None),
    availability: Availability = Query(default="すべて"),
    include_deleted: bool = Query(default=False),
) -> AnalysisDataResponse:
    """分析ダッシュボードの基礎データ（動画 + 期間内視聴回数）を返す。"""
    df, period_start, period_end = _scoped_df(period, start, end, availability, include_deleted)
    df = app_service.calculate_period_view_count(df, period_start, period_end)
    records = df_records(df)
    return AnalysisDataResponse(items=records, total=len(records))


@router.get("/analysis/viewing-history", response_model=List[ViewingHistoryItem])
def viewing_history(
    start: Optional[datetime] = Query(default=None),
    end: Optional[datetime] = Query(default=None),
    video_ids: Optional[List[str]] = Query(default=None, description="動画ID（複数可 / カンマ区切り可）"),
):
    """指定期間・動画群の視聴履歴を返す。"""
    ids = csv_int_list(video_ids) or []
    return df_records(app_service.get_viewing_history(start, end, ids))


@router.get("/analysis/judgment-history", response_model=List[JudgmentHistoryItem])
def judgment_history(
    start: Optional[datetime] = Query(default=None),
    end: Optional[datetime] = Query(default=None),
    video_ids: Optional[List[str]] = Query(default=None, description="動画ID（複数可 / カンマ区切り可）"),
):
    """指定期間・動画群の判定履歴を返す。"""
    ids = csv_int_list(video_ids) or []
    return df_records(app_service.get_judgment_history(start, end, ids))


@router.get("/analysis/viewing-trend", response_model=List[TrendItem])
def viewing_trend(
    period: PeriodPreset = Query(default="全期間"),
    start: Optional[date] = Query(default=None),
    end: Optional[date] = Query(default=None),
    availability: Availability = Query(default="すべて"),
    include_deleted: bool = Query(default=False),
    bucket: Bucket = Query(default="day"),
):
    """視聴回数のバケット別推移（サーバー側 SQL 集計。video_ids は受け取らない）。"""
    period_start, period_end = _resolve_period(period, start, end)
    df = app_service.get_viewing_trend(
        period_start, period_end, _AVAIL_TO_FILTER[availability], include_deleted, bucket
    )
    return df_records(df)


@router.get("/analysis/judgment-trend", response_model=List[TrendItem])
def judgment_trend(
    period: PeriodPreset = Query(default="全期間"),
    start: Optional[date] = Query(default=None),
    end: Optional[date] = Query(default=None),
    availability: Availability = Query(default="すべて"),
    include_deleted: bool = Query(default=False),
    bucket: Bucket = Query(default="day"),
    tier: Optional[int] = Query(default=None, ge=1, le=2),
):
    """判定のバケット別推移（バケットごとに COUNT(DISTINCT video_id)・サーバー側 SQL 集計）。"""
    period_start, period_end = _resolve_period(period, start, end)
    df = app_service.get_judgment_trend(
        period_start,
        period_end,
        _AVAIL_TO_FILTER[availability],
        include_deleted,
        bucket,
        tier,
    )
    return df_records(df)


@router.get("/analysis/likes-trend", response_model=List[TrendItem])
def likes_trend(
    period: PeriodPreset = Query(default="全期間"),
    start: Optional[date] = Query(default=None),
    end: Optional[date] = Query(default=None),
    availability: Availability = Query(default="すべて"),
    include_deleted: bool = Query(default=False),
    bucket: Bucket = Query(default="day"),
):
    """いいね数のバケット別推移（likes.liked_at 基準・videos JOIN・availability/period 連動）。"""
    period_start, period_end = _resolve_period(period, start, end)
    df = app_service.get_likes_trend(
        period_start, period_end, _AVAIL_TO_FILTER[availability], include_deleted, bucket
    )
    return df_records(df)


@router.get("/analysis/response-time", response_model=List[ResponseTimeItem])
def response_time():
    """判定応答時間データ（ヒストグラム用）を返す。"""
    return app_service.get_response_time_data()


@router.get("/analysis/rankings", response_model=AnalysisRankingResponse)
def analysis_rankings(
    kind: RankingKind = Query(..., description="view_count / view_days / likes"),
    period: PeriodPreset = Query(default="全期間"),
    start: Optional[date] = Query(default=None),
    end: Optional[date] = Query(default=None),
    availability: Availability = Query(default="すべて"),
    include_deleted: bool = Query(default=False),
    top_n: int = Query(default=50, ge=1, le=500),
) -> AnalysisRankingResponse:
    """分析ダッシュボード内の3種ランキング（視聴回数・視聴日数・いいね）を返す。"""
    df, period_start, period_end = _scoped_df(period, start, end, availability, include_deleted)

    if kind == "view_count":
        df = app_service.calculate_period_view_count(df, period_start, period_end)
        rdf = app_service.get_view_count_ranking(df, top_n)
    elif kind == "view_days":
        rdf = app_service.get_view_days_ranking(df, period_start, period_end, top_n)
    else:  # likes
        rdf = app_service.get_like_count_ranking(df, period_start, period_end, top_n)

    return AnalysisRankingResponse(kind=kind, items=_ranking_items(rdf, _SCORE_COL[kind]))


@router.get("/analysis/selection-trend", response_model=List[SelectionTrendItem])
def selection_trend(
    start: Optional[datetime] = Query(default=None),
    end: Optional[datetime] = Query(default=None),
):
    """セレクション判定の日次件数トレンドを返す。"""
    return df_records(app_service.get_selection_judgment_trend(start, end))


@router.get("/analysis/selection-distribution", response_model=List[SelectionDistributionItem])
def selection_distribution():
    """セレクション判定結果のレベル分布を返す。"""
    return df_records(app_service.get_selection_level_distribution())
