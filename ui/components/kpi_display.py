"""
ClipBox - KPI表示コンポーネント
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable, Optional

import streamlit as st


@dataclass(frozen=True)
class KpiCard:
    """st.metric で表示する KPI カード定義。"""

    label: str
    value: str
    help: Optional[str] = None


def render_metric_cards(cards: Iterable[KpiCard]) -> None:
    """
    KPIカードを横並びで表示する。
    """
    card_list = list(cards)
    if not card_list:
        return

    cols = st.columns(len(card_list))
    for col, card in zip(cols, card_list):
        with col:
            st.metric(
                label=card.label,
                value=card.value,
                help=card.help,
            )


def render_kpi_cards(
    unrated_count: int,
    judged_count: int,
    judged_rate: float,
    today_judged_count: int,
) -> None:
    """
    Tier 1 のKPIカードを横並びで表示する。
    """
    render_metric_cards(
        [
            KpiCard(
                label="📋 未判定",
                value=f"{unrated_count}本",
                help="未判定（内部値 -1）かつ利用可能・未削除の動画数",
            ),
            KpiCard(
                label="✅ 判定済み",
                value=f"{judged_count}本",
                help="判定済み動画数（Lv0以上）",
            ),
            KpiCard(
                label="📊 判定率",
                value=f"{judged_rate:.1f}%",
                help="利用可能かつ未削除の動画に対する判定済みの割合",
            ),
            KpiCard(
                label="📅 本日の判定",
                value=f"{today_judged_count}本",
                help="今日0:00以降に判定した動画数（重複なし）",
            ),
        ]
    )


def render_selection_kpi_cards(
    unselected_count: int,
    judged_count: int,
    judged_rate: float,
    today_judged_count: int,
) -> None:
    """
    Tier 2 のKPIカードを横並びで表示する。
    """
    render_metric_cards(
        [
            KpiCard(
                label="📋 未選別",
                value=f"{unselected_count}本",
                help="セレクション内で、まだ選別判定が行われていない動画数",
            ),
            KpiCard(
                label="✅ 選別済み",
                value=f"{judged_count}本",
                help="セレクション完了状態の動画数。画面表示では「選別済み」と表記する",
            ),
            KpiCard(
                label="📊 選別率",
                value=f"{judged_rate:.1f}%",
                help="セレクション対象に対する選別済みの割合",
            ),
            KpiCard(
                label="📅 本日の選別",
                value=f"{today_judged_count}本",
                help="今日0:00以降にセレクション判定した動画数（重複なし）",
            ),
        ]
    )
