"""
ClipBox - 動画カード表示コンポーネント
前回PRのコンパクトデザインを再現
"""

from __future__ import annotations

from datetime import datetime
from html import escape
from pathlib import Path
from typing import Callable, Optional

import streamlit as st

from core.models import Video
from ui.components.display_settings import DisplaySettings


def _inject_base_styles() -> None:
    """カード用のCSSスタイルを注入"""
    if st.session_state.get("_cb_video_card_css_injected"):
        return

    st.markdown(
        """
        <style>
/* カードマーカー（非表示） */
.cb-card-marker { display: none; }

/* コンパクトなボタンスタイル */
div[data-testid="stHorizontalBlock"] div[data-testid="column"] button {
    padding: 2px 4px !important;
    min-height: 22px !important;
    font-size: 13px !important;
    border-radius: 3px !important;
}

/* セレクトボックスのサイズ調整 */
div[data-testid="stHorizontalBlock"] div[data-testid="column"] .stSelectbox > div > div {
    min-width: 50px !important;
}

/* カラムのパディング削減 */
div[data-testid="column"] {
    padding: 1px !important;
}

/* 垂直ブロックのギャップ削減 */
section[data-testid="stVerticalBlock"] > div {
    gap: 2px !important;
}
        </style>
        <script>
// 選択中カード強調表示のスタイル適用
(function() {
    function applySelectedStyle() {
        // 以前の強調表示をリセット
        document.querySelectorAll('.cb-card-highlighted').forEach(el => {
            el.style.background = '';
            el.style.border = '';
            el.style.borderRadius = '';
            el.style.boxShadow = '';
            el.style.padding = '';
            el.classList.remove('cb-card-highlighted');
        });

        // 選択されたカードに強調表示を適用
        const selected = document.querySelector('.cb-selected');
        if (selected) {
            let parent = selected.parentElement;
            while (parent) {
                if (parent.classList.contains('stVerticalBlock')) {
                    parent.style.background = 'linear-gradient(180deg, #fff7ed 0%, #ffe8cc 100%)';
                    parent.style.border = '3px solid #f59e0b';
                    parent.style.borderRadius = '8px';
                    parent.style.boxShadow = '0 4px 12px rgba(245, 158, 11, 0.35)';
                    parent.style.padding = '4px';
                    parent.classList.add('cb-card-highlighted');
                    break;
                }
                parent = parent.parentElement;
            }
        }
    }

    // 初期適用
    setTimeout(applySelectedStyle, 100);

    // MutationObserverで変更を監視
    const observer = new MutationObserver(function(mutations) {
        applySelectedStyle();
    });
    observer.observe(document.body, { childList: true, subtree: true });
})();
        </script>
        """,
        unsafe_allow_html=True,
    )
    st.session_state["_cb_video_card_css_injected"] = True


def _create_badge(label: str, color: str) -> str:
    """HTMLバッジを生成"""
    return f'<span style="display:inline-block;padding:2px 6px;border-radius:6px;font-size:11px;color:#fff;background:{color};font-weight:600;box-shadow:0 1px 2px rgba(0,0,0,0.15);margin-right:3px;">{escape(label)}</span>'


def _build_badge_list(
    video: Video,
    settings: DisplaySettings,
    view_count: int,
    last_modified: Optional[datetime | str],
) -> list[str]:
    """動画情報からバッジHTMLリストを生成"""
    badges = []

    # 利用可否バッジ
    if settings.show_availability_badge:
        if video.is_available:
            badges.append(_create_badge("○", "#10b981"))
        else:
            badges.append(_create_badge("×", "#ef4444"))

    # 未判定バッジ（レベル-1の場合）
    is_judged = video.current_favorite_level >= 0
    if not is_judged:
        badges.append(_create_badge("未判定", "#f9a8d4"))

    # レベルバッジ（判定済みの場合）
    if settings.show_level_badge and is_judged:
        level_colors = {
            4: "#1d4ed8",
            3: "#2563eb",
            2: "#3b82f6",
            1: "#93c5fd",
            0: "#d1d5db",
        }
        level_display = f"Lv{video.current_favorite_level}"
        color = level_colors.get(video.current_favorite_level, "#d1d5db")
        badges.append(_create_badge(level_display, color))

    # 視聴回数バッジ
    if settings.show_view_count_badge:
        badges.append(_create_badge(f"視聴{view_count}", "#f97316"))

    # 保存場所バッジ
    if settings.show_storage_badge:
        storage_label = "C" if video.storage_location == "C_DRIVE" else "HDD"
        badges.append(_create_badge(storage_label, "#2563eb"))

    # ファイルサイズバッジ
    if settings.show_filesize_badge:
        if video.file_size:
            size_mb = video.file_size / (1024 * 1024)
            size_label = f"{size_mb:.0f}MB"
        else:
            size_label = "?"
        badges.append(_create_badge(size_label, "#475569"))

    # 更新日時バッジ
    if settings.show_modified_badge:
        modified_label = "???"
        ts = last_modified or video.last_file_modified
        if ts:
            if isinstance(ts, str):
                try:
                    ts = datetime.fromisoformat(ts)
                except Exception:
                    pass
            if hasattr(ts, "strftime"):
                modified_label = ts.strftime("%Y-%m-%d %H:%M")
        badges.append(_create_badge(modified_label, "#0ea5e9"))

    return badges


def render_video_card(
    video: Video,
    settings: DisplaySettings,
    *,
    view_count: int = 0,
    last_modified: Optional[datetime | str] = None,
    show_judgment_ui: bool = True,
    is_selected: bool = False,
    on_play_callback: Optional[Callable[[Video], None]] = None,
    on_judge_callback: Optional[Callable[[Video, int], None]] = None,
    key_prefix: str = "",
) -> None:
    """
    動画カードを描画（前回PRのコンパクトデザイン）

    レイアウト：
    - タイトル（上部）
    - ボタン・判定UI・バッジ（横並び）
    """

    _inject_base_styles()

    # 選択マーカー
    marker_classes = ["cb-card-marker"]
    if is_selected:
        marker_classes.append("cb-selected")

    is_disabled = not video.is_available
    title_text = video.essential_filename
    display_title = title_text[:settings.max_title_length] if len(title_text) > settings.max_title_length else title_text

    # カードコンテナ
    card = st.container(border=True)

    # 選択マーカー（CSSセレクタ用）
    card.markdown(f'<div class="{" ".join(marker_classes)}"></div>', unsafe_allow_html=True)

    # 選択中カードの視覚的インジケーター
    if is_selected:
        card.markdown(
            '<div style="background: linear-gradient(90deg, #f59e0b 0%, #fbbf24 100%); '
            'height: 4px; border-radius: 4px; margin: -4px 0 6px 0;"></div>',
            unsafe_allow_html=True,
        )

    # タイトル
    title_style = "" if video.is_available else ' style="opacity: 0.5; color: #9ca3af;"'
    # 選択中カードの背景色
    title_bg = "background: linear-gradient(180deg, #fff7ed 0%, #ffe8cc 100%); border-radius: 4px; padding: 2px 4px;" if is_selected else ""
    card.markdown(
        f'<div style="margin:0;padding:1px 2px;line-height:1.1;{title_bg}">'
        f'<span{title_style} style="font-size:15px;" title="{escape(title_text)}">{escape(display_title)}</span>'
        f'</div>',
        unsafe_allow_html=True,
    )

    # ボタン・判定UI・バッジの横並び配置
    key_base = f"{key_prefix}_" if key_prefix else ""

    if show_judgment_ui:
        btn_col, judge_col, select_col, badge_col = card.columns([2, 2, 4, 8])
    else:
        btn_col, badge_col = card.columns([1, 3])
        judge_col = None
        select_col = None

    # 再生ボタン
    with btn_col:
        if st.button("▶️", key=f"{key_base}play_{video.id}", disabled=is_disabled, help="再生"):
            if on_play_callback:
                on_play_callback(video)

    # 判定UI
    if show_judgment_ui and select_col and judge_col:
        with select_col:
            # レベル-1に対応
            judgment_options = [-1, 0, 1, 2, 3, 4]
            level_labels = {
                -1: "ー",  # 未判定
                0: "0",
                1: "1",
                2: "2",
                3: "3",
                4: "4",
            }

            # 現在のレベル
            current_level = video.current_favorite_level
            if current_level not in judgment_options:
                current_level = -1

            selected_level = st.selectbox(
                "レベル",
                options=judgment_options,
                format_func=lambda v: level_labels.get(v, str(v)),
                key=f"{key_base}judge_select_{video.id}",
                index=judgment_options.index(current_level),
                label_visibility="collapsed",
                disabled=is_disabled,
            )

        with judge_col:
            if st.button("✓", key=f"{key_base}judge_{video.id}", disabled=is_disabled, help="判定を確定"):
                if on_judge_callback:
                    on_judge_callback(video, selected_level)

    # バッジ表示
    with badge_col:
        badges = _build_badge_list(video, settings, view_count, last_modified)
        if badges:
            card.markdown(" ".join(badges), unsafe_allow_html=True)

    # ファイル名表示（オプション）
    if settings.show_filename_badge:
        file_name = Path(video.current_full_path).name
        card.markdown(
            f'<div style="color: #6b7280; font-size: 0.65em; line-height: 1.0; margin: 1px 2px 0; padding:0;">{escape(file_name)}</div>',
            unsafe_allow_html=True,
        )
