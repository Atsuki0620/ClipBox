"""
ClipBox - メインアプリケーション（UI層）
Streamlitベースの動画管理インターフェース
"""

import streamlit as st
import hashlib
from pathlib import Path

from core import app_service
from config import SCAN_DIRECTORIES, FAVORITE_LEVEL_NAMES, DATABASE_PATH
from ui.analysis_tab import render_analysis_tab
from ui.library_tab import render_library_tab, render_random_tab
from ui.extra_tabs import render_stats_tab, render_snapshot_tab, render_settings_tab


# ページ設定
st.set_page_config(
    page_title="ClipBox - 動画管理システム",
    page_icon="🎬",
    layout="wide",
    initial_sidebar_state="expanded"
)


def detect_and_record_file_access():
    """ファイルアクセスを検知して視聴履歴に記録"""
    try:
        # 前回のチェック日時を取得
        last_check_time = app_service.get_last_access_check_time()

        # 最近アクセスされたファイルを検知
        accessed_files = app_service.detect_recently_accessed_files_with_connection(last_check_time)

        # 検知した件数を表示
        if accessed_files:
            # 視聴履歴に記録
            video_manager = app_service.create_video_manager()
            recorded_count = app_service.record_file_access_as_viewing(video_manager, accessed_files)

            # 詳細情報を作成
            file_details = []
            for file_info in accessed_files:
                access_time_str = file_info['access_time'].strftime('%Y-%m-%d %H:%M:%S')
                file_details.append(f"- {file_info['essential_filename']} (アクセス日時: {access_time_str})")

            details_text = "\n".join(file_details)

            # 成功メッセージを表示
            st.success(
                f"✅ {recorded_count} 件のファイルアクセスを検知し、視聴履歴に記録しました。\n\n"
                f"【記録されたファイル】\n{details_text}"
            )
        else:
            if last_check_time:
                st.info(f"前回チェック ({last_check_time.strftime('%Y-%m-%d %H:%M:%S')}) 以降、新しいファイルアクセスは検知されませんでした。")
            else:
                st.info("新しいファイルアクセスは検知されませんでした。")

        # チェック日時を更新
        app_service.update_last_access_check_time()

        return recorded_count if accessed_files else 0

    except Exception as e:
        st.error(f"ファイルアクセス検知エラー: {e}")
        return 0



def _handle_play(video, trigger: str):
    """
    再生と履歴記録をまとめて実行するヘルパー。
    成功時は st.success、失敗時は st.error を出す。
    """
    player = st.session_state.user_config.get("default_player", "vlc")
    result = st.session_state.video_manager.play_video(video.id)

    if result.get("status") != "success":
        st.error(result.get("message", "再生に失敗しました"))
        return

    file_path = Path(video.current_full_path)
    internal_id = hashlib.sha256(str(file_path).encode("utf-8")).hexdigest()
    library_root = app_service.detect_library_root(file_path, st.session_state.user_config.get("library_roots", []))

    try:
        app_service.insert_play_history(
            file_path=str(file_path),
            title=video.essential_filename,
            player=player,
            library_root=library_root,
            trigger=trigger,
            video_id=video.id,
            internal_id=internal_id,
        )
        st.session_state.selected_video = video
        # カード内の細いカラムに通知を出すと縦長になるため、全幅のトーストで表示する
        st.toast("再生を開始しました")
    except Exception as e:
        st.error(f"再生履歴の記録に失敗しました: {e}")


def _handle_judgment(video, new_level):
    """
    お気に入りレベル変更ハンドラー

    Args:
        video: 対象動画
        new_level: None=未判定, 0=レベル0, 1-4=レベル1-4
    """
    result = app_service.set_favorite_level_with_rename(video.id, new_level)

    if result.get("status") == "success":
        st.success(result.get("message"))
        st.rerun()
    else:
        st.error(result.get("message", "判定処理に失敗しました"))


def init_session_state():
    """???????????"""
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

    if 'title_max_length' not in st.session_state:
        st.session_state.title_max_length = 40

    if 'search_keyword' not in st.session_state:
        st.session_state.search_keyword = ""

    # 起動時に自動でファイルアクセスを検知（初回のみ）
    # 要望により起動時の自動検知は無効化（誤検知防止）
    st.session_state.auto_detection_done = True


def check_and_init_database():
    """データベースの確認と初期化"""
    # 既存DBでも不足テーブルを補うため毎回 init_database を実行（CREATE IF NOT EXISTS で安全）
    app_service.init_database()
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


def render_sidebar():
    """サイドバーの描画"""
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

    # metrics
    total_videos, total_views = app_service.get_metrics()

    st.sidebar.metric("総動画数", f"{total_videos} 本")
    st.sidebar.metric("総視聴回数", f"{total_views} 回")

    # filter state init
    if 'filter_levels' not in st.session_state:
        st.session_state.filter_levels = [4, 3, 2, 1, 0]
    if 'filter_actors' not in st.session_state:
        st.session_state.filter_actors = []
    if 'filter_storage' not in st.session_state:
        st.session_state.filter_storage = ['C_DRIVE']
    if 'filter_availability' not in st.session_state:
        st.session_state.filter_availability = ['AVAILABLE']

    favorite_levels, performers, storage_locations = app_service.get_filter_options()

    st.sidebar.subheader('フィルタ')

    # レベル（マルチセレクト）
    level_options = [4, 3, 2, 1, 0]
    level_label_map = {lv: FAVORITE_LEVEL_NAMES.get(lv, f'レベル{lv}') for lv in level_options}
    selected_level_labels = st.sidebar.multiselect(
        'レベル',
        options=[level_label_map[lv] for lv in level_options],
        default=[level_label_map[lv] for lv in level_options if lv in st.session_state.filter_levels],
    )
    st.session_state.filter_levels = [lv for lv, label in level_label_map.items() if label in selected_level_labels]

    # 登場人物（マルチセレクト）
    selected_performers = st.sidebar.multiselect(
        '登場人物',
        options=performers,
        default=st.session_state.filter_actors,
        placeholder='名前で検索...',
    )
    st.session_state.filter_actors = selected_performers
    st.sidebar.caption(
        f"選択中: {', '.join(selected_performers)} ({len(selected_performers)}名)"
        if selected_performers else '選択中: なし'
    )

    # 保存場所（マルチセレクト）
    storage_options = ['すべて表示', 'Cドライブのみ', '外付けHDDのみ']
    storage_map = {
        'すべて表示': 'ALL',
        'Cドライブのみ': 'C_DRIVE',
        '外付けHDDのみ': 'EXTERNAL_HDD',
    }
    default_storage_labels = [label for label, code in storage_map.items() if code in st.session_state.filter_storage]
    selected_storage_labels = st.sidebar.multiselect(
        '保存場所',
        options=storage_options,
        default=default_storage_labels or ['Cドライブのみ'],
    )
    selected_storage_codes = [storage_map[label] for label in selected_storage_labels]
    if not selected_storage_codes:
        selected_storage_codes = ['C_DRIVE']
    st.session_state.filter_storage = selected_storage_codes
    selected_storage_values = None if 'ALL' in selected_storage_codes else selected_storage_codes

    # 利用可否（マルチセレクト）
    availability_options = ['利用可能のみ', '利用不可のみ']
    availability_map = {
        '利用可能のみ': 'AVAILABLE',
        '利用不可のみ': 'UNAVAILABLE',
    }
    default_avail_labels = [label for label, code in availability_map.items() if code in st.session_state.filter_availability]
    selected_avail_labels = st.sidebar.multiselect(
        '利用可否',
        options=availability_options,
        default=default_avail_labels or ['利用可能のみ'],
    )
    selected_avail_codes = [availability_map[label] for label in selected_avail_labels]
    if not selected_avail_codes:
        selected_avail_codes = ['AVAILABLE']
    st.session_state.filter_availability = selected_avail_codes
    if set(selected_avail_codes) == {'AVAILABLE'}:
        availability_filter = 'available'
    elif set(selected_avail_codes) == {'UNAVAILABLE'}:
        availability_filter = 'unavailable'
    else:
        availability_filter = None

    # フィルタとボタンの区切り線
    st.sidebar.markdown('---')

    # アクションボタン（隣接配置）
    if st.sidebar.button('📁 ファイルをスキャン', use_container_width=True):
        scan_files()
    if st.sidebar.button('📊 視聴履歴を検知', use_container_width=True):
        with st.spinner('視聴履歴を検知しています...'):
            detect_and_record_file_access()
            st.success('視聴履歴を更新しました')
            st.rerun()
    if st.sidebar.button('🔄 画面を更新', use_container_width=True, help='現在のフィルタ条件で一覧を再描画'):
        with st.spinner('現在のフィルタで再描画中...'):
            st.session_state.sidebar_refresh_notice = True
            st.rerun()
    if st.session_state.get('sidebar_refresh_notice'):
        st.sidebar.success('最新のフィルタで再描画しました')
        st.session_state.sidebar_refresh_notice = False

    return (
        st.session_state.filter_levels,
        st.session_state.filter_actors,
        selected_storage_values,
        availability_filter,
    )

def scan_files():
    """ファイルスキャン実行"""
    with st.spinner("ファイルをスキャン中..."):
        try:
            library_roots = [Path(p) for p in st.session_state.user_config.get("library_roots", SCAN_DIRECTORIES)]
            scanner = app_service.create_file_scanner(library_roots)
            app_service.scan_and_update_with_connection(scanner)
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


def main():
    """エントリーポイント"""
    init_session_state()
    check_and_init_database()

    st.title("🎬 ClipBox")

    # サイドバー（共通）
    render_sidebar()

    tab_library, tab_analysis, tab_random, tab_stats, tab_snapshot, tab_settings = st.tabs(
        ["動画一覧", "分析", "ランダム再生", "統計", "スナップショット", "設定"]
    )
    play_handler = lambda video, trigger="row_button": _handle_play(video, trigger)
    with tab_library:
        render_library_tab(play_handler, _handle_judgment)
    with tab_analysis:
        render_analysis_tab()
    with tab_random:
        render_random_tab(play_handler)
    with tab_stats:
        render_stats_tab()
    with tab_snapshot:
        render_snapshot_tab()
    with tab_settings:
        render_settings_tab(scan_files_for_settings)


if __name__ == "__main__":
    main()

