"""
ClipBox API - クエリパラメータ補助。

役割:
    配列クエリパラメータを「カンマ区切り（?levels=3,4）」と「repeated query
    （?levels=3&levels=4）」の両形式で受け取れるようにパースする。

【設計制約】
- FastAPI 既定の `List[int] = Query(...)` は repeated 形式のみ。本ヘルパで両対応にする。
- 整数変換に失敗したら 422（HTTPException）に寄せる（500 にしない）。
- `core` / `streamlit` を import しない（純粋なパース層）。

【依存関係】
api.videos / api.likes / api.analysis などのルーターから利用。
"""

from __future__ import annotations

from typing import List, Optional

from fastapi import HTTPException


def _split(values: Optional[List[str]]) -> Optional[List[str]]:
    """repeated/カンマ区切りの混在を平坦化する。空要素は除く。空なら None。"""
    if not values:
        return None
    out: List[str] = []
    for v in values:
        if v is None:
            continue
        out.extend(part for part in str(v).split(",") if part != "")
    return out or None


def csv_str_list(values: Optional[List[str]]) -> Optional[List[str]]:
    """文字列の配列パラメータを両形式対応でパースする。"""
    return _split(values)


def csv_int_list(values: Optional[List[str]]) -> Optional[List[int]]:
    """整数の配列パラメータを両形式対応でパースする。不正値は 422。"""
    parts = _split(values)
    if parts is None:
        return None
    try:
        return [int(p) for p in parts]
    except ValueError:
        raise HTTPException(status_code=422, detail="整数の配列パラメータが不正です")
