"""
ClipBox - 表示設定UIコンポーネント
"""

from __future__ import annotations

from dataclasses import dataclass
import streamlit as st


@dataclass
class DisplaySettings:
    """一覧カードの表示設定を保持するデータクラス。"""

    show_level_badge: bool = True
    show_availability_badge: bool = True
    show_view_count_badge: bool = False
    show_storage_badge: bool = False
    show_filesize_badge: bool = False
    show_modified_badge: bool = False
    show_filename_badge: bool = False
    max_title_length: int = 40
    num_columns: int = 3


def render_display_settings(key_prefix: str = "disp") -> DisplaySettings:
    """表示設定のUIを描画し、選択結果を返す。

    Args:
        key_prefix: Streamlitウィジェット用キーのプレフィックス（タブ間の衝突防止）
    """

    with st.expander("🎨 表示設定", expanded=False):
        col1, col2 = st.columns(2)

        with col1:
            st.write("**バッジ表示**")
            show_level = st.checkbox("レベル", value=True, key=f"{key_prefix}_level")
            show_avail = st.checkbox("利用可否", value=True, key=f"{key_prefix}_avail")
            show_views = st.checkbox("視聴回数", value=False, key=f"{key_prefix}_views")
            show_storage = st.checkbox("保存場所", value=False, key=f"{key_prefix}_storage")
            show_filesize = st.checkbox("ファイルサイズ", value=False, key=f"{key_prefix}_filesize")
            show_modified = st.checkbox("更新日時", value=False, key=f"{key_prefix}_modified")
            show_filename = st.checkbox("ファイル名", value=False, key=f"{key_prefix}_filename")

        with col2:
            st.write("**レイアウト**")
            max_title = st.slider(
                "タイトル最大文字数",
                min_value=20,
                max_value=100,
                value=40,
                step=5,
                key=f"{key_prefix}_max_title",
            )
            num_cols = st.select_slider(
                "カラム数",
                options=[1, 2, 3, 4, 5, 6],
                value=3,
                key=f"{key_prefix}_num_cols",
            )

    return DisplaySettings(
        show_level_badge=show_level,
        show_availability_badge=show_avail,
        show_view_count_badge=show_views,
        show_storage_badge=show_storage,
        show_filesize_badge=show_filesize,
        show_modified_badge=show_modified,
        show_filename_badge=show_filename,
        max_title_length=max_title,
        num_columns=num_cols,
    )
