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
    show_view_count_badge: bool = True  # F1: デフォルトONに変更
    show_storage_badge: bool = False
    show_filesize_badge: bool = False
    show_modified_badge: bool = False
    show_filename_badge: bool = True  # F1: デフォルトONに変更
    show_created_badge: bool = True  # F2: 作成日時追加（デフォルトON）
    max_title_length: int = 100
    num_columns: int = 3


def _init_defaults(key_prefix: str) -> None:
    """セッション状態にデフォルト値を初期化（B2修正：設定永続化）

    Streamlitのウィジェットは、keyを指定すると自動的にsession_stateに値を保存する。
    初回のみデフォルト値を設定し、以降はウィジェット自身が管理する。
    """
    defaults = {
        f"{key_prefix}_level": True,
        f"{key_prefix}_avail": True,
        f"{key_prefix}_views": True,  # F1: デフォルトON
        f"{key_prefix}_storage": False,
        f"{key_prefix}_filesize": False,
        f"{key_prefix}_modified": False,
        f"{key_prefix}_filename": True,  # F1: デフォルトON
        f"{key_prefix}_created": True,  # F2: デフォルトON
        f"{key_prefix}_max_title": 100,
    }
    for key, default_val in defaults.items():
        if key not in st.session_state:
            st.session_state[key] = default_val


def render_display_settings(key_prefix: str = "disp") -> DisplaySettings:
    """表示設定のUIを描画し、選択結果を返す。

    Args:
        key_prefix: Streamlitウィジェット用キーのプレフィックス（タブ間の衝突防止）
    """
    # 初回のみデフォルト値を設定
    _init_defaults(key_prefix)
    expander_key = f"{key_prefix}_expander_open"
    if expander_key not in st.session_state:
        st.session_state[expander_key] = False

    with st.expander("🎨 表示設定", expanded=st.session_state[expander_key]):
        # expander内の操作が発生したタイミングでは開状態を維持する。
        st.session_state[expander_key] = True
        st.write("**バッジ表示 / レイアウト**")
        col1, col2, col3, col4 = st.columns(4, gap="small")

        with col1:
            show_level = st.checkbox("レベル", key=f"{key_prefix}_level")
            show_avail = st.checkbox("利用可否", key=f"{key_prefix}_avail")
            show_views = st.checkbox("視聴回数", key=f"{key_prefix}_views")

        with col2:
            show_storage = st.checkbox("保存場所", key=f"{key_prefix}_storage")
            show_filesize = st.checkbox("ファイルサイズ", key=f"{key_prefix}_filesize")

        with col3:
            show_modified = st.checkbox("更新日時", key=f"{key_prefix}_modified")
            show_filename = st.checkbox("ファイル名", key=f"{key_prefix}_filename")
            show_created = st.checkbox("作成日時", key=f"{key_prefix}_created")

        with col4:
            max_title = st.slider(
                "タイトル最大文字数",
                min_value=20,
                max_value=100,
                step=5,
                key=f"{key_prefix}_max_title",
            )

    return DisplaySettings(
        show_level_badge=show_level,
        show_availability_badge=show_avail,
        show_view_count_badge=show_views,
        show_storage_badge=show_storage,
        show_filesize_badge=show_filesize,
        show_modified_badge=show_modified,
        show_filename_badge=show_filename,
        show_created_badge=show_created,
        max_title_length=max_title,
        num_columns=3,  # デフォルト値（外部から上書きされる）
    )
