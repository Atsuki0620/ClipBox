"""
ClipBox API - Pydantic レスポンス/リクエストモデル。

役割:
    HTTP レスポンスの JSON 形を snake_case で固定する。`core.models.Video`（dataclass）を
    API 向けの `VideoOut` に変換し、派生値（is_selection_completed / is_judged）も含める。

【設計制約】
- snake_case 固定（日本語カラム名は使わない）。
- 日時フィールドは SQLite から文字列で来るため `Optional[str]` で素通しする
  （ISO8601 文字列。pydantic で再パースしない）。
- `core` を import するのは型変換のためのみ（`core.models.Video`）。ロジックは持たない。

【依存関係】
core.models.Video → api.schemas.VideoOut（変換は VideoOut.from_video）
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field

from core.models import Video


class HealthResponse(BaseModel):
    """ヘルスチェックのレスポンス。"""

    status: str
    db_exists: bool


class RuntimeServiceResponse(BaseModel):
    name: str
    label: str
    port: int
    status: str
    pid: Optional[int] = None


class RuntimeStatusResponse(BaseModel):
    services: List[RuntimeServiceResponse]


class VideoOut(BaseModel):
    """動画1件の API レスポンス。`Video` dataclass の全フィールド + 派生値。"""

    id: Optional[int]
    essential_filename: str
    current_full_path: str
    current_favorite_level: int
    file_size: Optional[int]
    performer: Optional[str]
    storage_location: str
    last_file_modified: Optional[str]
    created_at: Optional[str]
    last_scanned_at: Optional[str]
    notes: Optional[str]
    file_created_at: Optional[str]
    is_available: bool
    is_deleted: bool
    is_judging: bool
    needs_selection: bool
    # 派生値（dataclass の property / メソッド）
    is_selection_completed: bool
    is_judged: bool
    watch_later: bool

    @classmethod
    def from_video(cls, v: Video) -> "VideoOut":
        """`core.models.Video` を VideoOut に変換する（派生値をここで評価）。"""
        return cls(
            id=v.id,
            essential_filename=v.essential_filename,
            current_full_path=v.current_full_path,
            current_favorite_level=v.current_favorite_level,
            file_size=v.file_size,
            performer=v.performer,
            storage_location=v.storage_location,
            last_file_modified=_as_str(v.last_file_modified),
            created_at=_as_str(v.created_at),
            last_scanned_at=_as_str(v.last_scanned_at),
            notes=v.notes,
            file_created_at=_as_str(v.file_created_at),
            is_available=bool(v.is_available),
            is_deleted=bool(v.is_deleted),
            is_judging=bool(v.is_judging),
            needs_selection=bool(v.needs_selection),
            is_selection_completed=v.is_selection_completed,
            is_judged=v.is_judged(),
            watch_later=bool(v.watch_later),
        )


class VideosResponse(BaseModel):
    """動画一覧のページング付きレスポンス。"""

    items: List[VideoOut]
    total: int
    page: int
    page_size: int


class VideosByIdsRequest(BaseModel):
    """ID指定の一括取得リクエスト（AVP候補のバッチ取得用）。"""

    ids: List[int]


class VideosByIdsResponse(BaseModel):
    """ID指定一括取得のレスポンス。items は入力順保持（削除済み含む）。

    見つからなかったID（削除消滅など）は missing_ids に入れ、クライアント側の
    永続候補（localStorage）の掃除に使えるようにする。
    """

    items: List[VideoOut]
    missing_ids: List[int]


class FilterOptionsResponse(BaseModel):
    """フィルタ UI 用の選択肢（使用中のレベル・保存場所）。

    performers（フォルダ名由来の暫定抽出）はフィルタに用いないため返さない。
    """

    favorite_levels: List[int]
    storage_locations: List[str]


class KpiResponse(BaseModel):
    """Tier1 KPI（未判定数・判定済み数・判定率・本日の判定数）。"""

    unrated_count: int
    judged_count: int
    judged_rate: float
    today_judged_count: int


class SelectionKpiResponse(BaseModel):
    """Tier2 セレクション KPI（未選別数・判定済み数・判定率・本日の判定数）。"""

    unselected_count: int
    judged_count: int
    judged_rate: float
    today_judged_count: int


class RankingItem(BaseModel):
    """ランキング1件（順位 + 動画 + スコア）。"""

    rank: int
    video: VideoOut
    score: int


class RankingResponse(BaseModel):
    """ランキング一覧（カード系 /api/ranking 用：動画をネストする）。"""

    items: List[RankingItem]


# --- mutation / 管理系 --------------------------------------------------------

class StatusMessageResponse(BaseModel):
    """status / message のみの汎用レスポンス（play / level / config 保存等）。"""

    status: str
    message: str


class PlayRequest(BaseModel):
    """再生リクエスト（すべて任意）。"""

    player: Optional[str] = None
    trigger: Optional[str] = None
    library_root: Optional[str] = None
    internal_id: Optional[str] = None


class AvpPlayRequest(BaseModel):
    """Awesome Video Player の並列再生リクエスト。"""

    video_ids: List[int]


class LevelRequest(BaseModel):
    """お気に入りレベル変更リクエスト。level=null は未判定。許容は null / -1..4。"""

    level: Optional[int] = Field(default=None, ge=-1, le=4)


class LikeResponse(BaseModel):
    """いいね追加後のレスポンス。"""

    video_id: int
    like_count: int


class WatchLaterResponse(BaseModel):
    """あとで見るトグル後のレスポンス。"""

    status: str
    message: str
    watch_later: bool


class ScanLibraryResponse(BaseModel):
    """ライブラリスキャン結果。"""

    status: str
    message: str


class ScanSelectionRequest(BaseModel):
    """セレクションフォルダスキャンのリクエスト（folder 省略時は config）。"""

    folder: Optional[str] = None


class ScanSelectionResponse(BaseModel):
    """セレクションフォルダスキャン結果。"""

    status: str
    message: str
    found_count: int


class BackupResponse(BaseModel):
    """DB バックアップ結果。"""

    status: str
    message: str
    filename: str
    size_bytes: int


class ConfigModel(BaseModel):
    """ユーザー設定（GET/PUT /api/config）。"""

    library_roots: List[str] = []
    default_player: str = "vlc"
    avp_exe_path: Optional[str] = None
    db_path: Optional[str] = None
    selection_folder: Optional[str] = None
    fate_tier1_recently_unwatched_priority: Optional[bool] = None
    fate_tier2_recently_unwatched_priority: Optional[bool] = None
    card_show_storage: Optional[bool] = None
    card_show_file_size: Optional[bool] = None
    card_show_last_viewed: Optional[bool] = None
    card_show_score: Optional[bool] = None
    card_show_file_modified: Optional[bool] = None
    card_title_max_length: Optional[int] = None


# --- 分析 --------------------------------------------------------------------

class AnalysisDataResponse(BaseModel):
    """分析ダッシュボードの基礎データ（動画ごとの集計レコード配列）。"""

    items: List[Dict[str, Any]]
    total: int


class ViewingHistoryItem(BaseModel):
    """視聴履歴1件。"""

    video_id: int
    viewed_at: Optional[str] = None


class JudgmentHistoryItem(BaseModel):
    """判定履歴1件。"""

    video_id: int
    judged_at: Optional[str] = None


class ResponseTimeItem(BaseModel):
    """判定応答時間1件（ヒストグラム用）。"""

    duration_ms: int
    storage: Optional[str] = None


class SelectionTrendItem(BaseModel):
    """セレクション判定の日次件数。"""

    date: str
    count: int


class TrendItem(BaseModel):
    """視聴/判定トレンドのバケット別件数（label=日/週(月曜開始日)/月）。"""

    label: str
    count: int


class SelectionDistributionItem(BaseModel):
    """セレクション判定結果のレベル分布。"""

    level: Optional[int] = None
    count: int


class AnalysisRankingItem(BaseModel):
    """分析ダッシュボードのランキング1件（フラット snake_case・型付き）。"""

    rank: int
    filename: str
    is_available: Optional[bool] = None
    storage_location: Optional[str] = None
    file_created_at: Optional[str] = None
    favorite_level: int
    score: int


class AnalysisRankingResponse(BaseModel):
    """分析ランキング一覧（kind に応じた score 列）。"""

    kind: str
    items: List[AnalysisRankingItem]


def _as_str(value) -> Optional[str]:
    """日時等を文字列に正規化する（SQLite からは通常 str で来るが datetime も許容）。"""
    if value is None:
        return None
    return value if isinstance(value, str) else str(value)
