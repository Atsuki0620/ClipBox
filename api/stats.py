"""
ClipBox API - 統計・ランキングのルーター（read）。

役割:
    Tier1/Tier2 KPI、視聴回数・最終視聴日時マップ、ランキングタブ用の順位付き動画を返す。

【設計制約】
- `core.app_service` のファサード経由でのみ DB にアクセスする。read-only。
- ランキングの列挙パラメータ（type/period/availability）は `Literal` で 422 に寄せる
  （特に period は不正値で core が KeyError になるため境界で固定する）。
- selection-kpi の folder 省略時は config の selection_folder、未設定なら全体 KPI（None）。
- `streamlit` を import しない。

【依存関係】
api.stats → core.app_service → core.analysis_service / core.selection_service / core.database
api.stats → api.schemas（KpiResponse / SelectionKpiResponse / RankingItem / RankingResponse / VideoOut）
"""

from __future__ import annotations

from typing import Dict, Literal, Optional

from fastapi import APIRouter, Query

from core import app_service
from api.schemas import (
    KpiResponse,
    RankingItem,
    RankingResponse,
    SelectionKpiResponse,
    VideoOut,
)

router = APIRouter()


@router.get("/stats/kpi", response_model=KpiResponse)
def stats_kpi() -> KpiResponse:
    """Tier1 KPI（未判定数・判定済み数・判定率・本日の判定数）を返す。"""
    return KpiResponse(**app_service.get_kpi_stats())


@router.get("/stats/selection-kpi", response_model=SelectionKpiResponse)
def stats_selection_kpi(
    folder: Optional[str] = Query(default=None, description="セレクションフォルダ（省略時は config、未設定なら全体）"),
) -> SelectionKpiResponse:
    """Tier2 セレクション KPI を返す。folder 未指定時は config → 全体 KPI にフォールバック。"""
    folder_path = folder or app_service.load_user_config().get("selection_folder") or None
    return SelectionKpiResponse(**app_service.get_selection_kpi(folder_path))


@router.get("/stats/view-counts", response_model=Dict[int, int])
def stats_view_counts() -> Dict[int, int]:
    """全動画の視聴回数マップ（video_id → count）を返す。"""
    return app_service.get_view_counts_map()


@router.get("/stats/last-viewed", response_model=Dict[int, str])
def stats_last_viewed() -> Dict[int, str]:
    """全動画の最終視聴日時マップ（video_id → ISO文字列）を返す。"""
    return app_service.get_last_viewed_map()


@router.get("/ranking", response_model=RankingResponse)
def ranking(
    type: Literal["view_count", "view_days", "likes", "composite"] = Query(..., description="ランキング種別"),
    period: Literal["180日", "1年", "全期間"] = Query(default="全期間", description="集計期間"),
    min_level: Optional[int] = Query(default=None, description="最低レベル（省略時は制限なし）"),
    availability: Literal["利用可能のみ", "利用不可のみ", "すべて"] = Query(default="利用可能のみ"),
    top_n: int = Query(default=10, ge=1, le=200, description="表示件数"),
) -> RankingResponse:
    """種別・期間・条件でランク付けした動画とスコアを返す（カード系：動画をネスト）。"""
    ranked = app_service.get_ranked_videos_for_tab(type, period, min_level, availability, top_n)
    items = [
        RankingItem(rank=i + 1, video=VideoOut.from_video(video), score=int(score))
        for i, (video, score) in enumerate(ranked)
    ]
    return RankingResponse(items=items)
