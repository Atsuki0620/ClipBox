import streamlit as st
from core import app_service

__all__ = ["render_settings_tab"]

@st.fragment
def render_settings_tab(scan_files_for_settings):
    """設定タブのみ残したバージョン"""
    st.subheader("🛠️ 設定")
    cfg = st.session_state.user_config

    library_roots_text = st.text_area(
        "ライブラリルートパス（行ごとに入力）",
        value="\n".join(cfg.get("library_roots", [])),
        height=120,
    )
    default_player = st.text_input("既定プレイヤー", value=cfg.get("default_player", "vlc"))

    if st.button("設定を保存", use_container_width=True):
        new_roots = [line.strip() for line in library_roots_text.splitlines() if line.strip()]
        cfg.update({"library_roots": new_roots, "default_player": default_player})
        app_service.save_user_config(cfg)
        st.success("設定を保存しました")

    if st.button("保存先をスキャン", use_container_width=True):
        scan_files_for_settings()
        st.success("ファイルスキャンを完了しました")
        st.rerun()
