"""
ClipBox API - 動画 read 系ルーター（一覧・単体・検索・ランダム・セレクション・フィルタ選択肢）。

役割:
    動画の読み取りエンドポイントを提供する。フィルタ条件で取得し、サーバー側でソート・
    ページングして返す。view_count / last_viewed ソートは視聴回数・最終視聴日時マップを併用する。

【設計制約】
- `core.app_service` のファサード経由でのみ DB にアクセスする。read-only。
- キーワード絞り込み（normalize_text 正規化での本質的ファイル名 部分一致）は **core 側**
  （`app_service.get_videos(keyword=...)`）に委譲する。API 層では二重実装しない。
- ルートは「固定パスを先、`/videos/{video_id}` を最後」に定義する（FastAPI のパス解決順序。
  さもないと `/videos/search` 等が `{video_id}` に吸われ 422 になる）。
- 列挙パラメータは `Literal` で 422 に寄せる。配列は `api._params` で両形式対応。
- `streamlit` を import しない。

【依存関係】
api.videos → core.app_service → core.video_manager / core.database
api.videos → api.schemas（VideoOut / VideosResponse / FilterOptionsResponse）
api.videos → api._params（配列クエリの両形式パース）
"""

from __future__ import annotations

from typing import List, Literal, Optional

from fastapi import APIRouter, HTTPException, Query, Response

from api._params import csv_int_list, csv_str_list
from api.schemas import (
    FilterOptionsResponse,
    VideoOut,
    VideosByIdsRequest,
    VideosByIdsResponse,
    VideosResponse,
)
from core import app_service
from core.models import Video, is_path_within

router = APIRouter()

SortField = Literal["favorite_level", "creation_date", "view_count", "last_viewed", "title", "judged_at"]
Order = Literal["asc", "desc"]


def _apply_sort(
    videos: List[Video],
    sort: Optional[str],
    order: Optional[str],
    *,
    selection: bool = False,
) -> List[Video]:
    """Video リストをサーバー側ソートする。sort 未指定なら get_videos の既定順序を維持する。

    既定方向は降順（title のみ昇順）。order を明示すると優先する。
    view_count / last_viewed / judged_at は app_service のマップを引いて並べ替える。
    judged_at は Tier 別（selection=False=Tier1 / True=Tier2）の最新判定日時を使い、
    判定履歴の無い動画は asc/desc いずれでも常に末尾に置く（partition 方式）。
    """
    if not sort:
        return videos

    reverse = (order != "asc") if order else (sort != "title")

    if sort == "favorite_level":
        return sorted(videos, key=lambda v: v.current_favorite_level, reverse=reverse)
    if sort == "creation_date":
        return sorted(videos, key=lambda v: (v.file_created_at or v.created_at or ""), reverse=reverse)
    if sort == "title":
        return sorted(videos, key=lambda v: v.essential_filename.lower(), reverse=reverse)
    if sort == "view_count":
        view_counts = app_service.get_view_counts_map()
        return sorted(videos, key=lambda v: view_counts.get(v.id, 0), reverse=reverse)
    if sort == "last_viewed":
        last_viewed = app_service.get_last_viewed_map()
        return sorted(videos, key=lambda v: (last_viewed.get(v.id) or ""), reverse=reverse)
    if sort == "judged_at":
        judged_at = app_service.get_latest_judged_at_map(selection)
        judged = [v for v in videos if judged_at.get(v.id)]
        unjudged = [v for v in videos if not judged_at.get(v.id)]
        judged.sort(key=lambda v: judged_at.get(v.id) or "", reverse=reverse)
        # 未判定（判定履歴なし）は order に依らず常に末尾。
        return judged + unjudged
    return videos


def _paginate(videos: List[Video], page: int, page_size: int) -> VideosResponse:
    """ソート済み Video リストをページングして VideosResponse に詰める。"""
    total = len(videos)
    offset = (page - 1) * page_size
    page_items = videos[offset : offset + page_size]
    return VideosResponse(
        items=[VideoOut.from_video(v) for v in page_items],
        total=total,
        page=page,
        page_size=page_size,
    )


def _folder_filter(videos: List[Video], folder: str) -> List[Video]:
    """current_full_path が folder 配下の動画のみ残す（区切り境界を尊重＝is_path_within）。"""
    return [v for v in videos if is_path_within(v.current_full_path, folder)]


# --- 固定パス（/videos/{video_id} より前に定義すること） ----------------------

@router.get("/videos", response_model=VideosResponse)
def list_videos(
    levels: Optional[List[str]] = Query(default=None, description="お気に入りレベル（複数可 / カンマ区切り可）。-1=未判定"),
    storage: Optional[List[str]] = Query(default=None, description="保存場所 C_DRIVE / EXTERNAL_HDD"),
    availability: Optional[Literal["available", "unavailable"]] = Query(default=None),
    show_unavailable: bool = Query(default=False, description="利用不可も含める（availability 省略時のみ有効）"),
    show_deleted: bool = Query(default=False, description="論理削除済みも含める"),
    watch_later: Optional[bool] = Query(default=None, description="True=あとで見るのみ / 省略=全て"),
    needs_selection_filter: Optional[bool] = Query(default=None, description="True=未選別のみ / False=通常のみ / 省略=全て"),
    exclude_selection: bool = Query(default=False, description="セレクション対象・完了を除外"),
    keyword: Optional[str] = Query(default=None, description="本質的ファイル名の部分一致検索（core 側で normalize_text 正規化）"),
    sort: Optional[SortField] = Query(default=None, description="favorite_level / creation_date / view_count / last_viewed / title / judged_at"),
    order: Optional[Order] = Query(default=None, description="asc / desc（既定: title は asc、他は desc）"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=100, ge=1, le=200),
) -> VideosResponse:
    """フィルタ条件に合致する動画一覧を、サーバー側ソート + ページングで返す。

    keyword は core（`get_videos`）でフィルタ適用後・ソート前に正規化部分一致される。
    judged_at は Tier1 判定（was_selection_judgment=0）の最新日時で並べる。
    """
    videos = app_service.get_videos(
        favorite_levels=csv_int_list(levels),
        storage_locations=csv_str_list(storage),
        keyword=keyword,
        availability=availability,
        show_unavailable=show_unavailable,
        show_deleted=show_deleted,
        watch_later_filter=watch_later,
        needs_selection_filter=needs_selection_filter,
        exclude_selection=exclude_selection,
    )
    videos = _apply_sort(videos, sort, order, selection=False)
    return _paginate(videos, page, page_size)


@router.get("/videos/search", response_model=List[VideoOut])
def search_videos(
    keyword: str = Query(default="", description="検索語（空で全件）"),
    storage: Optional[List[str]] = Query(default=None, description="保存場所 C_DRIVE / EXTERNAL_HDD"),
) -> List[VideoOut]:
    """ファイル名でDB内動画を部分一致検索する（normalize_text 正規化一致）。"""
    videos = app_service.search_videos(keyword, storage_locations=csv_str_list(storage))
    return [VideoOut.from_video(v) for v in videos]


@router.get("/videos/unrated/random", response_model=List[VideoOut])
def unrated_random(n: int = Query(default=1, ge=1, le=200, description="取得本数")) -> List[VideoOut]:
    """未判定動画をランダムに n 本返す（ファイル存在チェック済み）。"""
    videos = app_service.get_unrated_random_videos(n)
    return [VideoOut.from_video(v) for v in videos]


@router.get("/videos/unrated/fate", response_model=VideoOut, responses={204: {"description": "未判定動画なし"}})
def unrated_fate():
    """未判定動画を純ランダムに1本返す。該当なしは 204 No Content。"""
    video = app_service.get_unrated_fate_video()
    if video is None:
        return Response(status_code=204)
    return VideoOut.from_video(video)


@router.get("/videos/selection", response_model=VideosResponse)
def list_selection(
    folder: str = Query(..., description="セレクションフォルダパス（必須）"),
    status: Literal["all", "unselected", "completed"] = Query(default="all"),
    levels: Optional[List[str]] = Query(default=None, description="お気に入りレベル（複数可 / カンマ区切り可）。-1=未判定"),
    storage: Optional[List[str]] = Query(default=None, description="保存場所 C_DRIVE / EXTERNAL_HDD"),
    keyword: Optional[str] = Query(default=None, description="本質的ファイル名の部分一致検索（core 側で normalize_text 正規化）"),
    show_unavailable: bool = Query(default=False, description="利用不可も含める"),
    sort: Optional[SortField] = Query(default=None),
    order: Optional[Order] = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=100, ge=1, le=200),
) -> VideosResponse:
    """指定セレクションフォルダ配下の動画を選別状態 + フィルタで絞り込んで返す。"""
    needs_selection_filter = {"all": None, "unselected": True, "completed": False}[status]
    videos = app_service.get_videos(
        favorite_levels=csv_int_list(levels),
        storage_locations=csv_str_list(storage),
        keyword=keyword,
        needs_selection_filter=needs_selection_filter,
        show_unavailable=show_unavailable,
        show_deleted=False,
    )
    videos = _folder_filter(videos, folder)
    videos = _apply_sort(videos, sort, order, selection=True)
    return _paginate(videos, page, page_size)


@router.get("/videos/selection/fate", response_model=VideoOut, responses={204: {"description": "未選別動画なし"}})
def selection_fate(folder: str = Query(..., description="セレクションフォルダパス")):
    """未選別動画から経過日数重み付けで1本返す。該当なしは 204 No Content。"""
    video = app_service.get_fate_video(folder)
    if video is None:
        return Response(status_code=204)
    return VideoOut.from_video(video)


@router.post("/videos/by-ids", response_model=VideosByIdsResponse)
def get_videos_by_ids(req: VideosByIdsRequest) -> VideosByIdsResponse:
    """指定IDの動画をまとめて取得する（入力順保持・削除済み含む）。

    見つからなかったID（削除消滅など）は missing_ids に入れて返す。AVP候補の
    バッチ取得用（候補が無制限でも 1 リクエストで済む）。
    `/videos/{video_id}` より前に定義する（パス解決順）。
    """
    videos = app_service.get_videos_by_ids(req.ids)
    found_ids = {v.id for v in videos}
    missing = [vid for vid in dict.fromkeys(req.ids) if vid not in found_ids]
    return VideosByIdsResponse(
        items=[VideoOut.from_video(v) for v in videos],
        missing_ids=missing,
    )


@router.get("/filter-options", response_model=FilterOptionsResponse)
def filter_options() -> FilterOptionsResponse:
    """フィルタ UI 用の選択肢（使用中のレベル・登場人物・保存場所）を返す。"""
    return FilterOptionsResponse(**app_service.get_filter_options())


# --- 動的パス（必ず最後に定義） ----------------------------------------------

@router.get("/videos/{video_id}", response_model=VideoOut)
def get_video(video_id: int) -> VideoOut:
    """動画IDを指定して1件取得する（削除済みも返す＝現行踏襲）。存在しなければ 404。"""
    videos = app_service.get_videos_by_ids([video_id])
    if not videos:
        raise HTTPException(status_code=404, detail="動画が見つかりません")
    return VideoOut.from_video(videos[0])
