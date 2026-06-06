"""
ClipBox API - pandas DataFrame の JSON 安全直列化。

役割:
    analysis_service が返す DataFrame を JSON 化可能な list[dict] に変換する。
    NaN/NaT→None、pandas.Timestamp→ISO8601 文字列、numpy スカラ→Python 型へ正規化する。

【設計制約】
- `core` / `streamlit` を import しない（pandas のみ依存の純変換層）。
- 値ごとに型を正規化し、`json` でそのまま直列化できる状態にする。

【依存関係】
api.analysis から DataFrame レスポンスの整形に利用。
"""

from __future__ import annotations

from typing import Any, Dict, List

import pandas as pd


def _clean(value: Any) -> Any:
    """単一の値を JSON 安全な Python 型へ正規化する。"""
    if value is None:
        return None
    # NaN / NaT をスカラ判定して None に倒す（配列が来た場合は判定をスキップ）
    try:
        if pd.isna(value):
            return None
    except (TypeError, ValueError):
        pass
    if isinstance(value, pd.Timestamp):
        return value.isoformat()
    # numpy スカラ（int64/float64/bool_ 等）は .item() で Python 型へ
    if hasattr(value, "item"):
        return value.item()
    return value


def df_records(df: pd.DataFrame) -> List[Dict[str, Any]]:
    """DataFrame を JSON 安全な list[dict] に変換する。"""
    if df is None or df.empty:
        return []
    return [{k: _clean(v) for k, v in record.items()} for record in df.to_dict(orient="records")]
