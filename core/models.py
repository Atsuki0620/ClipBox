"""
ClipBox - モデル定義
動画メタ情報のデータクラスと共通ユーティリティを提供
"""

import os
import unicodedata
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Optional


@dataclass
class Video:
    """動画メタ情報モデル"""
    id: Optional[int]
    essential_filename: str
    current_full_path: str
    current_favorite_level: int
    file_size: Optional[int]
    performer: Optional[str]
    storage_location: str  # 'C_DRIVE' or 'EXTERNAL_HDD'
    last_file_modified: Optional[datetime]
    created_at: Optional[datetime]
    last_scanned_at: Optional[datetime]
    notes: Optional[str] = None
    file_created_at: Optional[datetime] = None
    is_available: bool = True
    is_deleted: bool = False
    is_judging: bool = False  # F4: 判定中フラグ
    needs_selection: bool = False  # セレクション対象フラグ（?プレフィックス）
    watch_later: bool = False  # あとで見るフラグ（DBカラム由来。判定/選別完了で自動解除）

    @property
    def is_selection_completed(self) -> bool:
        """ファイル名に+プレフィックスが付いているかどうか（セレクション経由済み）"""
        return Path(self.current_full_path).name.startswith('+')

    def is_judged(self) -> bool:
        """判定済みかどうかを判別（プレフィックスの有無で判定）"""
        filename = Path(self.current_full_path).name
        return filename != self.essential_filename


@dataclass
class ViewingHistory:
    """視聴履歴モデル"""
    id: Optional[int]
    video_id: int
    viewed_at: datetime
    viewing_method: str  # 'APP_PLAYBACK', 'MANUAL_ENTRY', 'FILE_ACCESS_DETECTED'


class _ReverseStr:
    """文字列降順ソート用ラッパークラス"""
    __slots__ = ("_s",)

    def __init__(self, s: str):
        self._s = s

    def __lt__(self, other):
        return self._s > other._s

    def __gt__(self, other):
        return self._s < other._s

    def __le__(self, other):
        return self._s >= other._s

    def __ge__(self, other):
        return self._s <= other._s

    def __eq__(self, other):
        return self._s == other._s

    def __hash__(self):
        return hash(self._s)


def normalize_text(text: str) -> str:
    """全角半角・大小・カナ差を吸収した簡易正規化"""
    if text is None:
        return ""
    norm = unicodedata.normalize("NFKC", text).lower()
    result_chars = []
    for ch in norm:
        code = ord(ch)
        if 0x30a1 <= code <= 0x30f6:
            result_chars.append(chr(code - 0x60))
        else:
            result_chars.append(ch)
    return "".join(result_chars)


def is_path_within(path: str, folder: str) -> bool:
    """path が folder 配下（または folder 自身）かを、区切り文字境界を尊重して判定する。

    単純な前方一致だと `C:\\sel` が `C:\\selection2\\...` に誤マッチするため、
    os.path.normcase/normpath で正規化し、完全一致または `folder + os.sep` 始まりのみ True とする。
    ファイルシステムには触れない（存在しないパスでも判定可）。
    """
    if not path or not folder:
        return False
    p = os.path.normcase(os.path.normpath(path))
    f = os.path.normcase(os.path.normpath(folder))
    return p == f or p.startswith(f + os.sep)


def create_sort_key(video, sort_option: str, view_counts: dict, last_viewed_map: dict):
    """ソートキー生成（純粋関数）"""
    from datetime import datetime

    vc = view_counts.get(video.id, 0)
    lv = last_viewed_map.get(video.id)
    if isinstance(lv, str):
        try:
            lv = datetime.fromisoformat(lv)
        except Exception:
            lv = None

    name = normalize_text(video.essential_filename)

    fc = video.file_created_at
    if isinstance(fc, str):
        try:
            fc = datetime.fromisoformat(fc)
        except Exception:
            fc = None

    fm = video.last_file_modified
    if isinstance(fm, str):
        try:
            fm = datetime.fromisoformat(fm)
        except Exception:
            fm = None

    sort_keys = {
        "お気に入り:高い順": (-video.current_favorite_level, video.id),
        "お気に入り:低い順": (video.current_favorite_level, video.id),
        "視聴回数:多い順": (-vc, video.id),
        "視聴回数:少ない順": (vc, video.id),
        "最終視聴:新しい順": ((-lv.timestamp()) if lv else float("inf"), video.id),
        "最終視聴:古い順": ((lv.timestamp()) if lv else float("inf"), video.id),
        "ファイル作成:新しい順": ((-fc.timestamp()) if fc else float("inf"), video.id),
        "ファイル作成:古い順": ((fc.timestamp()) if fc else float("inf"), video.id),
        "ファイル更新:新しい順": ((-fm.timestamp()) if fm else float("inf"), video.id),
        "ファイル更新:古い順": ((fm.timestamp()) if fm else float("inf"), video.id),
        "タイトル:昇順": name,
        "タイトル:降順": _ReverseStr(name),
    }
    return sort_keys.get(sort_option, video.id)
