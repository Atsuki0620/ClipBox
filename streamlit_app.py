# -*- coding: utf-8 -*-
"""
ClipBox - メインアプリケーション（UI層）
Streamlitベースの動画管理インターフェース
"""

import streamlit as st
import hashlib
from pathlib import Path
from core import app_service
from ui import cache as ui_cache
from config import SCAN_DIRECTORIES, FAVORITE_LEVEL_NAMES, DATABASE_PATH
from ui.analysis_tab import render_analysis_tab
# from ui.analysis_tab_v2 import render_analysis_tab_v2  # archived: Phase 1
from ui.tier1_tab import render_tier1_tab
from ui.tier2_tab import render_tier2_tab
from ui.library_tab import render_library_tab
from ui.unrated_random_tab import render_unrated_random_tab
from ui.extra_tabs import render_settings_tab
from ui.selection_tab import render_selection_tab
from ui.search_tab import render_search_tab
from ui.ranking_tab import render_ranking_tab
from ui.avp_tab import render_avp_tab

# ページ設定
st.set_page_config(
    page_title="ClipBox - 動画管理システム",
    page_icon="🎬",
    layout="wide",
    initial_sidebar_state="expanded"
)

# ARCHIVED (Phase 1): detect_and_record_file_access - see archive/detect_file_access.py

def _handle_play(video, trigger: str):
    """
    再生と履歴記録をまとめて実行するヘルパー。
    成功時は st.success、失敗時は st.error を出す。
    F4: 再生開始時にis_judging=Trueに設定
    """
    player = st.session_state.user_config.get("default_player", "vlc")
    file_path = Path(video.current_full_path)
    internal_id = hashlib.sha256(str(file_path).encode("utf-8")).hexdigest()
    library_root = app_service.detect_library_root(file_path, st.session_state.user_config.get("library_roots", []))
    result = st.session_state.video_manager.play_video(
        video.id,
        player=player,
        trigger=trigger,
        library_root=library_root,
        internal_id=internal_id,
    )
    if result.get("status") != "success":
        st.error(result.get("message", "再生に失敗しました"))
        return

    # F4: 判定中フラグをON -- archived: Phase 1
    # st.session_state.video_manager.set_judging_state(video.id, True)
    # if "unrated_videos" in st.session_state:
    #     for v in st.session_state.unrated_videos:
    #         if v.id == video.id:
    #             v.is_judging = True
    #             break
    # if st.session_state.get("unrated_fate_video") and st.session_state.unrated_fate_video.id == video.id:
    #     st.session_state.unrated_fate_video.is_judging = True
    st.session_state.selected_video = video
    # 再生後はキャッシュを無効化して最新の視聴回数・KPIを表示する
    ui_cache.get_view_counts_and_last_viewed.clear()
    ui_cache.get_kpi_stats_cached.clear()
    ui_cache.get_metrics.clear()
    # カード内の細いカラムに通知を出すと縦長になるため、全幅のトーストで表示する
    st.toast("再生を開始しました")
    st.rerun(scope="fragment")  # フラグメントのみ再実行（タブ切り替え防止）

def _handle_judgment(video, new_level):
    """
    お気に入りレベル変更ハンドラー
    F4: 判定完了時にis_judging=Falseに設定
    Args:
        video: 対象動画
        new_level: None=未判定, 0=レベル0, 1-4=レベル1-4
    """
    result = app_service.set_favorite_level_with_rename(video.id, new_level)
    if result.get("status") == "success":
        # F4: 判定中フラグをOFF -- archived: Phase 1
        # st.session_state.video_manager.set_judging_state(video.id, False)
        st.session_state.selected_video = video
        # 判定後はキャッシュを無効化して最新のKPI・フィルタオプションを表示する
        ui_cache.get_kpi_stats_cached.clear()
        ui_cache.get_filter_options.clear()
        # 未判定ランダムタブのセッションキャッシュ内 Video オブジェクトを更新
        if "unrated_videos" in st.session_state:
            for v in st.session_state.unrated_videos:
                if v.id == video.id:
                    v.current_favorite_level = new_level
                    break
        if st.session_state.get("unrated_fate_video") and st.session_state.unrated_fate_video.id == video.id:
            fate_v = st.session_state.unrated_fate_video
            fate_v.current_favorite_level = new_level
        st.toast(result.get("message"))
        st.rerun(scope="fragment")  # フラグメントのみ再実行（タブ切り替え防止）
    else:
        st.error(result.get("message", "判定処理に失敗しました"))

def init_session_state():
    """セッション状態を初期化"""
    if "user_config" not in st.session_state:
        st.session_state.user_config = app_service.load_user_config()
    if 'initialized' not in st.session_state:
        st.session_state.initialized = False
    if 'video_manager' not in st.session_state:
        st.session_state.video_manager = app_service.create_video_manager()
    if 'selected_video' not in st.session_state:
        st.session_state.selected_video = None

    # 表示設定のデフォルト値
    if 'display_settings' not in st.session_state:
        st.session_state.display_settings = {
            'level': True,
            'available': True,
            'view_count': False,
            'storage': False,
            'file_size': False,
            'updated': False,
            'filename': False
        }

    # フィルタ初期値（タブ内で利用するため共通管理）
    if 'filter_levels' not in st.session_state:
        st.session_state.filter_levels = [4, 3, 2, 1, 0, -1]
    if 'filter_actors' not in st.session_state:
        st.session_state.filter_actors = []
    if 'filter_storage' not in st.session_state:
        st.session_state.filter_storage = ['C_DRIVE']
    if 'filter_availability' not in st.session_state:
        st.session_state.filter_availability = ['AVAILABLE']
    # ARCHIVED (Phase 1): filter_judging_only — 判定中フィルタ無効化に伴い初期化も不要
    # if 'filter_judging_only' not in st.session_state:
    #     st.session_state.filter_judging_only = False
    if 'filter_hide_selection' not in st.session_state:
        st.session_state.filter_hide_selection = True
    # 集計期間の選択肢変更に対応: 旧値が残っている場合はリセット
    if st.session_state.get("ranking_period") not in ("180日", "1年", "全期間", None):
        st.session_state["ranking_period"] = "全期間"
    if 'title_max_length' not in st.session_state:
        st.session_state.title_max_length = 40
    if 'search_keyword' not in st.session_state:
        st.session_state.search_keyword = ""
    # AVP再生タブ用：タブ横断チェック済みIDと再生中IDを管理
    if "avp_selected_ids" not in st.session_state:
        st.session_state.avp_selected_ids = set()
    if "avp_playing_ids" not in st.session_state:
        st.session_state.avp_playing_ids = []
    if "avp_launch_selected" not in st.session_state:
        st.session_state.avp_launch_selected = set()
    # 起動時に自動でファイルアクセスを検知（初回のみ）
    # 要望により起動時の自動検知は無効化（誤検知防止）
    st.session_state.auto_detection_done = True

def check_and_init_database():
    """データベースの確認と初期化"""
    if not app_service.check_database_exists():
        st.error(f"データベースが見つかりません: {DATABASE_PATH}")
        st.info("セットアップスクリプトを実行してください:")
        st.code("python archive/setup_db.py", language="bash")
        st.stop()

    # 既存DBでも新規テーブルを追加するため毎回初期化を実行
    try:
        app_service.init_database()
    except Exception as e:
        st.error(f"データベース初期化に失敗しました: {e}")
        st.stop()

    # マイグレーション実行（レベル-1導入）
    try:
        result = app_service.run_startup_migration()
        if result.get("status") == "completed" and result.get("updated_count", 0) > 0:
            st.info(f"✅ {result['message']}")
    except Exception as e:
        st.error(f"マイグレーション実行に失敗しました: {e}")
        st.stop()

def render_sidebar() -> str:
    """サイドバーの描画と画面選択"""
    st.sidebar.title("🎬 ClipBox")
    st.sidebar.markdown(
        """
        <style>
        .stMultiSelectClearAll {display:none !important;}
        button[title="Clear all"] {display:none !important;}
        button[aria-label="Clear all"] {display:none !important;}
        div[data-testid="stMultiSelectClearAll"] {display:none !important;}
        </style>
        """,
        unsafe_allow_html=True,
    )

    avp_count = len(st.session_state.get("avp_selected_ids", set()))
    avp_label = f"AVP再生 ({avp_count})" if avp_count > 0 else "AVP再生"

    nav_selection = st.sidebar.radio(
        "ナビゲーション",
        ["Tier 1", "Tier 2", "ランキング", "分析ダッシュボード", "検索", avp_label, "設定"],
        index=0,
        label_visibility="collapsed",
    )

    st.sidebar.markdown("---")
    if st.sidebar.button('📁 ファイルをスキャン', use_container_width=True):
        scan_files()

    return nav_selection

def scan_files():
    """ファイルスキャン実行"""
    with st.spinner("ファイルをスキャン中..."):
        try:
            library_roots = [Path(p) for p in st.session_state.user_config.get("library_roots", SCAN_DIRECTORIES)]
            scanner = app_service.create_file_scanner(library_roots)
            app_service.scan_and_update_with_connection(scanner)
            # セレクションフォルダが設定されていれば一緒にスキャンして is_available を同期する
            selection_folder_str = st.session_state.user_config.get("selection_folder", "")
            if selection_folder_str:
                app_service.scan_selection_folder(Path(selection_folder_str))
            # スキャン後はキャッシュを無効化して最新の状態を表示する
            ui_cache.get_filter_options.clear()
            ui_cache.get_metrics.clear()
            ui_cache.get_kpi_stats_cached.clear()
            st.success("ファイルスキャンが完了しました！")
            st.rerun()
        except Exception as e:
            st.error(f"スキャンエラー: {e}")

def scan_files_for_settings():
    """
    設定変更後に即時反映用のスキャン。
    設定タブから呼び出すため、rerun は設定側で制御する。
    """
    library_roots = [Path(p) for p in st.session_state.user_config.get("library_roots", SCAN_DIRECTORIES)]
    scanner = app_service.create_file_scanner(library_roots)
    app_service.scan_and_update_with_connection(scanner)
    # セレクションフォルダが設定されていれば一緒にスキャンして is_available を同期する
    selection_folder_str = st.session_state.user_config.get("selection_folder", "")
    if selection_folder_str:
        app_service.scan_selection_folder(Path(selection_folder_str))

def main():
    """エントリーポイント"""
    init_session_state()
    check_and_init_database()
    st.title("🎬 ClipBox")

    # サイドバー（共通）
    selected_view = render_sidebar()

    play_handler = lambda video, trigger="row_button": _handle_play(video, trigger)

    if selected_view == "Tier 1":
        render_tier1_tab(play_handler, _handle_judgment)
    elif selected_view == "Tier 2":
        render_tier2_tab(play_handler, _handle_judgment)
    elif selected_view == "ランキング":
        render_ranking_tab(play_handler, _handle_judgment)
    elif selected_view == "分析ダッシュボード":
        render_analysis_tab()
    elif selected_view == "検索":
        render_search_tab(play_handler, _handle_judgment)
    elif selected_view.startswith("AVP再生"):
        render_avp_tab(_handle_judgment)
    elif selected_view == "設定":
        render_settings_tab(scan_files_for_settings)
    else:
        st.info("画面を選択してください。")
if __name__ == "__main__":
    main()

