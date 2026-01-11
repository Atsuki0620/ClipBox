"""
ライブラリ（動画一覧）タブのUI部品
streamlit_app から分離し UI を薄く保つ
"""

from datetime import datetime
from pathlib import Path
import streamlit as st

from core import app_service
from core.models import normalize_text, create_badge, level_to_display, create_sort_key
from config import FAVORITE_LEVEL_NAMES, SCAN_DIRECTORIES


def _build_badge_list(video, show_items: dict, view_count: int, updated_label: str, level_colors: dict, judged: bool) -> list[str]:
    """動画情報からバッジHTMLを生成"""
    badges = []

    if show_items.get("available", True):
        badges.append(create_badge("○", "#10b981") if video.is_available else create_badge("×", "#ef4444"))

    if not judged:
        badges.append(create_badge("未判定", "#f9a8d4"))

    if show_items.get("level", True) and judged:
        badges.append(create_badge(level_to_display(video.current_favorite_level), level_colors.get(video.current_favorite_level, "#d1d5db")))

    if show_items.get("view_count", False):
        badges.append(create_badge(f"視聴{view_count}", "#f97316"))

    if show_items.get("storage", False):
        storage_short = "C" if video.storage_location == "C_DRIVE" else "HDD"
        badges.append(create_badge(storage_short, "#2563eb"))

    if show_items.get("file_size", False):
        size_short = f"{video.file_size / (1024*1024):.0f}MB" if video.file_size else "?"
        badges.append(create_badge(size_short, "#475569"))

    if show_items.get("updated", False):
        badges.append(create_badge(updated_label, "#0ea5e9"))

    return badges


def _render_video_card(video, col, view_count: int, show_items: dict, title_max_length: int, level_colors: dict, last_viewed_label: str, on_play, on_judge):
    """1件の動画カードを描画"""
    judged = video.is_judged()
    is_disabled = not video.is_available
    title_text = video.essential_filename
    display_title = video.get_truncated_title(title_max_length)
    level_key = f"judge_level_{video.id}"

    with col:
        row = st.container(border=True)

        title_style = "" if video.is_available else ' style="opacity: 0.5; color: #9ca3af;"'
        row.markdown(
            f'<div style="margin:0;padding:1px 2px;line-height:1.1;">'
            f'<span{title_style} style="font-size:15px;" title="{title_text}">{display_title}</span>'
            f'</div>',
            unsafe_allow_html=True,
        )

        btn_col, judge_col, select_col, badge_col = row.columns([2, 2, 4, 8])

        with btn_col:
            if st.button("▶️", key=f"play_{video.id}", disabled=is_disabled, help="再生"):
                on_play(video)

        with select_col:
            judgment_options = [4, 3, 2, 1, 0, None]
            level_labels_with_none = {4: "4", 3: "3", 2: "2", 1: "1", 0: "0", None: "ー"}
            default_level = video.current_favorite_level if judged else None
            selected = st.selectbox(
                "レベル",
                options=judgment_options,
                format_func=lambda v: level_labels_with_none[v],
                key=level_key,
                index=judgment_options.index(default_level),
                label_visibility="collapsed",
                disabled=is_disabled,
            )

        with judge_col:
            if st.button("✓", key=f"judge_{video.id}", disabled=is_disabled, help="判定を確定"):
                on_judge(video, selected)

        with badge_col:
            badges = _build_badge_list(video, show_items, view_count, last_viewed_label, level_colors, judged)
            if badges:
                st.markdown(" ".join(badges), unsafe_allow_html=True)

        if show_items.get("filename", False):
            file_name = Path(video.current_full_path).name
            row.markdown(
                f'<div style="color: #6b7280; font-size: 0.65em; line-height: 1.0; margin: 1px 2px 0; padding:0;">{file_name}</div>',
                unsafe_allow_html=True,
            )


def render_video_list(videos, *, sort_option: str | None = None, col_count: int = 2, show_items: dict | None = None, title_max_length: int = 40, on_play=None, on_judge=None):
    """動画一覧の描画。カラム数可変でカード表示を担当"""
    if not videos:
        st.info("条件に合う動画が見つかりませんでした。")
        return

    if show_items is None:
        show_items = {
            "level": True,
            "available": True,
            "view_count": False,
            "storage": False,
            "file_size": False,
            "updated": False,
            "filename": False,
        }

    # 視聴回数と最終視聴
    view_counts, last_viewed_map = app_service.get_view_counts_and_last_viewed()

    if st.session_state.selected_video:
        current = st.session_state.selected_video
        st.success(f"直近に再生した動画: {current.essential_filename}")

    st.caption("タイトルまたは「▶️再生」をクリックすると既定のプレイヤーで再生します。")

    if sort_option:
        videos = sorted(
            videos,
            key=lambda v: create_sort_key(v, sort_option, view_counts, last_viewed_map),
        )

    level_colors = {4: "#1d4ed8", 3: "#2563eb", 2: "#3b82f6", 1: "#93c5fd", 0: "#d1d5db"}
    col_count = int(max(1, min(6, col_count)))

    st.markdown(
        """
    <style>
    div[data-testid="column"] { padding: 1px !important; }
    section[data-testid="stVerticalBlock"] > div { gap: 2px !important; }
    div[data-testid="stHorizontalBlock"] div[data-testid="column"] button {
        padding: 2px 4px !important;
        min-height: 22px !important;
        font-size: 13px !important;
        border-radius: 3px !important;
    }
    div[data-testid="stHorizontalBlock"] div[data-testid="column"] .stSelectbox > div > div {
        min-width: 50px !important;
    }
    </style>
    """,
        unsafe_allow_html=True,
    )

    for i in range(0, len(videos), col_count):
        cols = st.columns(col_count, gap="small")
        for col, video in zip(cols, videos[i : i + col_count]):
            updated_label = "???"
            if video.last_file_modified:
                ts = video.last_file_modified
                if isinstance(ts, str):
                    try:
                        ts = datetime.fromisoformat(ts)
                    except Exception:
                        ts = None
                if hasattr(ts, "strftime"):
                    updated_label = ts.strftime("%Y-%m-%d %H:%M")

            view_count = view_counts.get(video.id, 0)
            _render_video_card(
                video=video,
                col=col,
                view_count=view_count,
                show_items=show_items,
                title_max_length=title_max_length,
                level_colors=level_colors,
                last_viewed_label=updated_label,
                on_play=on_play,
                on_judge=on_judge,
            )


def render_library_tab(on_play, on_judge):
    """動画一覧タブを描画"""
    col_layout = st.columns([1, 1, 1], gap="small")
    with col_layout[0]:
        col_count = st.radio("カラム数", options=[1, 2, 3, 4, 5, 6], index=3, horizontal=True)
    with col_layout[1]:
        sort_option = st.selectbox(
            "ソート",
            [
                "お気に入り:高い順",
                "お気に入り:低い順",
                "視聴回数:多い順",
                "視聴回数:少ない順",
                "最終視聴:新しい順",
                "最終視聴:古い順",
                "ファイル作成:新しい順",
                "ファイル作成:古い順",
                "ファイル更新:新しい順",
                "ファイル更新:古い順",
                "タイトル:昇順",
                "タイトル:降順",
            ],
            index=0,
        )
    with col_layout[2]:
        search_keyword = st.text_input("タイトル検索（全角半角・大小文字・かなカナを無視）", value=st.session_state.search_keyword)
        st.session_state.search_keyword = search_keyword

    with st.expander("表示項目の切り替え"):
        cols_disp = st.columns(4)
        show_items = {}
        show_items["level"] = cols_disp[0].checkbox("レベル", value=st.session_state.display_settings.get("level", True))
        show_items["available"] = cols_disp[1].checkbox("利用可否", value=st.session_state.display_settings.get("available", True))
        show_items["view_count"] = cols_disp[2].checkbox("視聴回数", value=st.session_state.display_settings.get("view_count", False))
        show_items["storage"] = cols_disp[3].checkbox("保存場所", value=st.session_state.display_settings.get("storage", False))
        show_items["file_size"] = cols_disp[0].checkbox("ファイルサイズ", value=st.session_state.display_settings.get("file_size", False))
        show_items["updated"] = cols_disp[1].checkbox("更新日時", value=st.session_state.display_settings.get("updated", False))
        show_items["filename"] = cols_disp[2].checkbox("フルファイル名", value=st.session_state.display_settings.get("filename", False))
        title_max_length = cols_disp[3].slider("タイトル最大文字数", min_value=20, max_value=80, value=40, step=5)
        st.session_state.display_settings.update(show_items)

    vm = st.session_state.video_manager
    availability = None
    if st.session_state.filter_availability == ["AVAILABLE"]:
        availability = "available"
    elif st.session_state.filter_availability == ["UNAVAILABLE"]:
        availability = "unavailable"

    videos = vm.get_videos(
        favorite_levels=st.session_state.filter_levels,
        performers=st.session_state.filter_actors,
        storage_locations=None if "ALL" in st.session_state.filter_storage else st.session_state.filter_storage,
        availability=availability,
        show_unavailable=True if availability is None else False,
        show_deleted=False,
    )

    if search_keyword:
        key_norm = normalize_text(search_keyword)
        videos = [v for v in videos if key_norm in normalize_text(v.essential_filename)]

    render_video_list(
        videos=videos,
        sort_option=sort_option,
        col_count=col_count,
        show_items=show_items,
        title_max_length=title_max_length,
        on_play=lambda v: on_play(v, trigger="row_button"),
        on_judge=on_judge,
    )


def render_random_tab(on_play):
    """ランダム再生タブ"""
    st.subheader("🎲 ランダム再生")
    vm = st.session_state.video_manager

    favorite_levels = st.multiselect(
        "対象レベル",
        options=[4, 3, 2, 1, 0],
        default=[4, 3, 2, 1, 0],
        format_func=lambda lv: FAVORITE_LEVEL_NAMES.get(lv, f"レベル{lv}"),
    )
    performers = st.multiselect(
        "登場人物（任意）",
        options=app_service.get_filter_options()[1],
        default=[],
        placeholder="未入力なら全員",
    )

    if st.button("🎲 ランダム再生", use_container_width=True):
        video = vm.get_random_video(favorite_levels=favorite_levels, performers=performers)
        if video is None:
            st.warning("該当する動画がありません。フィルタを緩めてください。")
        else:
            st.success(f"選択: {video.essential_filename}")
            on_play(video, trigger="random_tab")
