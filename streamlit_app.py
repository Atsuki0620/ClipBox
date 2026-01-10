"""
ClipBox - メインアプリケーション（UI層）
Streamlitベースの動画管理インターフェース
"""

import streamlit as st
import pandas as pd
import hashlib
from pathlib import Path
from datetime import datetime
import unicodedata
import textwrap

from core import app_service
from config import SCAN_DIRECTORIES, FAVORITE_LEVEL_NAMES, DATABASE_PATH


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
        with app_service.get_db_connection() as conn:
            accessed_files = app_service.detect_recently_accessed_files(last_check_time, conn)

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


def _detect_library_root(file_path: Path) -> str:
    """
    SCAN_DIRECTORIES のどれに属するかを判定し、該当パス文字列を返す。
    マッチしない場合は空文字列。
    """
    active_roots = st.session_state.user_config.get("library_roots", [])
    for root in active_roots:
        root_path = Path(root)
        try:
            Path(file_path).resolve().relative_to(root_path.resolve())
            return str(root_path)
        except ValueError:
            continue
    return ""


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
    library_root = _detect_library_root(file_path)

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
    お気に入りレベルを変更

    new_level:
        None: 未判定（プレフィックスなし）
        0: レベル0（_プレフィックス）
        1-4: レベル1-4（#*_プレフィックス）
    """
    if new_level is None:
        # 未判定に変更 → プレフィックスを完全削除
        new_filename = video.essential_filename
        db_level = 0
    elif new_level == 0:
        # レベル0に変更 → _プレフィックス
        new_filename = f"_{video.essential_filename}"
        db_level = 0
    else:
        # レベル1-4 → #*_プレフィックス
        prefix = "#" * new_level
        new_filename = f"{prefix}_{video.essential_filename}"
        db_level = new_level

    current_path = Path(video.current_full_path)
    new_path = current_path.with_name(new_filename)

    try:
        if new_path != current_path:
            current_path.rename(new_path)

        # データベース更新
        result = st.session_state.video_manager.set_favorite_level(video.id, db_level)

        if result.get("status") == "success":
            level_name = "未判定" if new_level is None else f"レベル{new_level}"
            st.success(f"判定完了: {level_name}")
            st.rerun()
        else:
            st.error(result.get("message"))

    except Exception as e:
        st.error(f"判定処理に失敗しました: {e}")


def init_session_state():
    """セッション状態の初期化"""
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


def _normalize_text(text: str) -> str:
    """全角/半角・大小・カナ差を吸収した簡易正規化"""
    if text is None:
        return ""
    norm = unicodedata.normalize("NFKC", text).lower()
    result_chars = []
    for ch in norm:
        code = ord(ch)
        if 0x30a1 <= code <= 0x30f6:
            result_chars.append(chr(code - 0x60))  # カタカナ→ひらがな
        else:
            result_chars.append(ch)
    return "".join(result_chars)

def is_judged(video) -> bool:
    """
    判定済みかどうかを判別

    ロジック:
    - current_full_pathのファイル名とessential_filenameを比較
    - 一致 → プレフィックスなし → 未判定
    - 不一致 → プレフィックスあり → 判定済み
    """
    filename = Path(video.current_full_path).name
    return filename != video.essential_filename

def _level_to_star(level: int) -> str:
    # 旧称を流用しているが内容は数値バッジ用に置き換え
    level = max(0, min(4, level))
    return f"Lv{level}"

def _badge(label: str, color: str) -> str:
    return f'<span class="cb-badge" style="background:{color}; padding:4px 4px; margin:0 2px 2px 0; border-radius:6px; font-size:0.85em; box-shadow:0 1px 3px rgba(0,0,0,0.2); display:inline-block; color:white; font-weight:500;">{label}</span>'

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


def get_filter_options():
    """フィルタオプションを取得"""
    with app_service.get_db_connection() as conn:
        # お気に入りレベルの取得
        cursor = conn.execute(
            "SELECT DISTINCT current_favorite_level FROM videos ORDER BY current_favorite_level DESC"
        )
        favorite_levels = [row[0] for row in cursor.fetchall()]

        # 登場人物の取得
        cursor = conn.execute(
            "SELECT DISTINCT performer FROM videos WHERE performer IS NOT NULL ORDER BY performer"
        )
        performers = [row[0] for row in cursor.fetchall()]

        # 保存場所の取得
        cursor = conn.execute(
            "SELECT DISTINCT storage_location FROM videos ORDER BY storage_location"
        )
        storage_locations = [row[0] for row in cursor.fetchall()]

    return favorite_levels, performers, storage_locations


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
    with app_service.get_db_connection() as conn:
        cursor = conn.execute("SELECT COUNT(*) FROM videos")
        total_videos = cursor.fetchone()[0]
        cursor = conn.execute("SELECT COUNT(*) FROM viewing_history")
        total_views = cursor.fetchone()[0]

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

    favorite_levels, performers, storage_locations = get_filter_options()

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
            with app_service.get_db_connection() as conn:
                scanner.scan_and_update(conn)
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
    with app_service.get_db_connection() as conn:
        scanner.scan_and_update(conn)


def render_video_list(videos, sort_option: str | None = None, col_count: int = 2, show_items: dict = None, title_max_length: int = 40):
    """動画一覧の描画（カラム数可変、情報をコンパクトに表示）"""
    if not videos:
        st.info("条件に合う動画が見つかりませんでした。")
        return

    # デフォルトの表示設定
    if show_items is None:
        show_items = {
            'level': True,
            'available': True,
            'view_count': False,
            'storage': False,
            'file_size': False,
            'updated': False,
            'filename': False
        }

    # 視聴回数と最終視聴
    with app_service.get_db_connection() as conn:
        rows = conn.execute(
            "SELECT video_id, COUNT(*) AS cnt, MAX(viewed_at) AS last_viewed FROM viewing_history GROUP BY video_id"
        ).fetchall()
        view_counts = {r["video_id"]: r["cnt"] for r in rows}
        last_viewed_map = {r["video_id"]: r["last_viewed"] for r in rows}

    if st.session_state.selected_video:
        current = st.session_state.selected_video
        st.success(f"直近に再生した動画: {current.essential_filename}")

    st.caption("タイトルまたは「▶️ 再生」をクリックすると既定のプレイヤーで再生します。")

    def _sort_key(video):
        vc = view_counts.get(video.id, 0)
        lv = last_viewed_map.get(video.id)
        if isinstance(lv, str):
            try:
                lv = datetime.fromisoformat(lv)
            except Exception:
                lv = None
        name = _normalize_text(video.essential_filename)

        # ファイル作成日時を取得
        fc = video.file_created_at
        if isinstance(fc, str):
            try:
                fc = datetime.fromisoformat(fc)
            except Exception:
                fc = None

        # ファイル更新日時を取得
        fm = video.last_file_modified
        if isinstance(fm, str):
            try:
                fm = datetime.fromisoformat(fm)
            except Exception:
                fm = None

        if sort_option == "お気に入り:高い順":
            return (-video.current_favorite_level, video.id)
        if sort_option == "お気に入り:低い順":
            return (video.current_favorite_level, video.id)
        if sort_option == "視聴回数:多い順":
            return (-vc, video.id)
        if sort_option == "視聴回数:少ない順":
            return (vc, video.id)
        if sort_option == "最終視聴:新しい順":
            return ((-lv.timestamp()) if lv else float("inf"), video.id)
        if sort_option == "最終視聴:古い順":
            return ((lv.timestamp()) if lv else float("inf"), video.id)
        if sort_option == "ファイル作成:新しい順":
            return ((-fc.timestamp()) if fc else float("inf"), video.id)
        if sort_option == "ファイル作成:古い順":
            return ((fc.timestamp()) if fc else float("inf"), video.id)
        if sort_option == "ファイル更新:新しい順":
            return ((-fm.timestamp()) if fm else float("inf"), video.id)
        if sort_option == "ファイル更新:古い順":
            return ((fm.timestamp()) if fm else float("inf"), video.id)
        if sort_option == "タイトル:昇順":
            return name
        if sort_option == "タイトル:降順":
            return name[::-1]
        return video.id

    if sort_option:
        videos = sorted(videos, key=_sort_key)

    # レベル→数字＋色のマップ
    level_labels = {4: "4", 3: "3", 2: "2", 1: "1", 0: "0"}
    level_colors = {4: "#1d4ed8", 3: "#2563eb", 2: "#3b82f6", 1: "#93c5fd", 0: "#d1d5db"}
    col_count = int(max(1, min(6, col_count)))

    # カード段間の余白を最小化
    st.markdown("""
    <style>
    div[data-testid="column"] {
        padding: 1px !important;
    }
    section[data-testid="stVerticalBlock"] > div {
        gap: 2px !important;
    }
    </style>
    """, unsafe_allow_html=True)

    for i in range(0, len(videos), col_count):
        cols = st.columns(col_count, gap="small")
        for col, video in zip(cols, videos[i:i + col_count]):
            storage_label = "Cドライブ" if video.storage_location == "C_DRIVE" else "外付けHDD"
            size_label = f"{video.file_size / (1024*1024):.1f} MB" if video.file_size else "不明"
            updated_label = "未取得"
            if video.last_file_modified:
                ts = video.last_file_modified
                if isinstance(ts, str):
                    try:
                        ts = datetime.fromisoformat(ts)
                    except Exception:
                        ts = None
                if hasattr(ts, "strftime"):
                    updated_label = ts.strftime('%Y-%m-%d %H:%M')

            view_count = view_counts.get(video.id, 0)

            with col:
                # カスタムCSSで余白を最小化し、ボタンをコンパクト化
                st.markdown("""
                <style>
                /* === カード段間の余白最小化 === */
                section[data-testid="stVerticalBlock"] > div[data-testid="stVerticalBlock"] {
                    gap: 0px !important;
                }
                section[data-testid="stVerticalBlock"] > div[style*="flex-direction: column"] > div {
                    margin-bottom: 0px !important;
                    padding-bottom: 0 !important;
                }

                /* === カード内の余白最小化 === */
                .stVerticalBlock > div[data-testid="stVerticalBlock"] {
                    padding: 2px 4px !important;
                    gap: 0px !important;
                }
                div[data-testid="stVerticalBlock"] > div:first-child {
                    padding-top: 0 !important;
                    margin-top: 0 !important;
                }
                div[data-testid="stVerticalBlock"] > div:last-child {
                    padding-bottom: 0 !important;
                    margin-bottom: 0 !important;
                }

                /* === カラム（横並び要素）の余白調整 === */
                .stHorizontalBlock {
                    gap: 21px !important;
                    margin: 0 !important;
                    padding: 1px 0 !important;
                }
                div[data-testid="column"] {
                    padding: 1px !important;
                }
                div[data-testid="column"] > div {
                    padding: 0 !important;
                }

                /* === 要素コンテナの余白削減 === */
                .element-container {
                    margin: 0 !important;
                    padding: 0 !important;
                }
                div[data-testid="element-container"] {
                    margin-bottom: 1px !important;
                    padding-bottom: 0 !important;
                }

                /* === ボタンのコンパクト化 === */
                div[data-testid="column"] button {
                    padding: 0.25rem 0.5rem !important;
                    font-size: 0.875rem !important;
                    line-height: 1.2 !important;
                    min-height: 1.5rem !important;
                    height: auto !important;
                }
                div[data-testid="column"] .stButton {
                    margin: 0 !important;
                    padding: 0 !important;
                }
                div[data-testid="column"] .stButton > button {
                    margin: 0 !important;
                }

                /* === セレクトボックスのコンパクト化 === */
                div[data-testid="column"] .stSelectbox {
                    margin: 0 !important;
                    padding: 0 !important;
                }
                div[data-testid="column"] .stSelectbox > div > div {
                    padding: 0.25rem 0.5rem !important;
                    font-size: 0.875rem !important;
                    min-height: 1.5rem !important;
                }

                /* === 行間隔の統一 === */
                div[data-testid="stMarkdownContainer"] {
                    margin-top: 1px !important;
                    margin-bottom: 1px !important;
                }
                </style>
                """, unsafe_allow_html=True)

                row = st.container(border=True)

                # タイトルと状態の準備
                title_text = video.essential_filename
                if len(title_text) > title_max_length:
                    display_title = title_text[:title_max_length] + "..."
                else:
                    display_title = title_text

                if video.is_available:
                    title_style = ""
                else:
                    title_style = ' style="opacity: 0.5; color: #9ca3af;"'

                level_key = f"judge_level_{video.id}"
                is_disabled = not video.is_available

                # 判定済み/未判定の判別
                judged = is_judged(video)

                # セレクトボックスの選択肢とデフォルト値
                judgment_options = [4, 3, 2, 1, 0, None]
                level_labels_with_none = {4: "4", 3: "3", 2: "2", 1: "1", 0: "0", None: "ー"}

                if judged:
                    default_level = video.current_favorite_level
                else:
                    default_level = None

                # 1行目: タイトルのみ
                row.markdown(f'<div style="margin:0;padding:1px 2px;line-height:1.1;"><span{title_style} title="{title_text}"><strong>{display_title}</strong></span></div>', unsafe_allow_html=True)

                # 2行目: 再生ボタン + 判定ボタン + セレクトボックス + バッジ
                btn_col, judge_col, select_col, badge_col = row.columns([1, 1, 3, 7])

                with btn_col:
                    if st.button("▶️", key=f"play_{video.id}", disabled=is_disabled, help="再生"):
                        _handle_play(video, trigger="row_button")

                with select_col:
                    selected = st.selectbox(
                        "レベル",
                        options=judgment_options,
                        format_func=lambda v: level_labels_with_none[v],
                        key=level_key,
                        index=judgment_options.index(default_level),
                        label_visibility="collapsed",
                        disabled=is_disabled
                    )

                with judge_col:
                    if st.button("✓", key=f"judge_{video.id}", disabled=is_disabled, help="判定を確定"):
                        _handle_judgment(video, selected)

                with badge_col:
                    # バッジ類
                    all_badges = []

                    if show_items.get('available', True):
                        if video.is_available:
                            all_badges.append(_badge("○", "#10b981"))
                        else:
                            all_badges.append(_badge("×", "#ef4444"))

                    # 未判定バッジ
                    if not judged:
                        all_badges.append(_badge("未判定", "#f9a8d4"))

                    if show_items.get('level', True) and judged:
                        all_badges.append(_badge(_level_to_star(video.current_favorite_level), level_colors.get(video.current_favorite_level, "#d1d5db")))

                    if show_items.get('view_count', False):
                        all_badges.append(_badge(f"視聴{view_count}", "#f97316"))

                    if show_items.get('storage', False):
                        storage_short = "C" if video.storage_location == "C_DRIVE" else "HDD"
                        all_badges.append(_badge(storage_short, "#2563eb"))

                    if show_items.get('file_size', False):
                        size_short = f"{video.file_size / (1024*1024):.0f}MB" if video.file_size else "?"
                        all_badges.append(_badge(size_short, "#475569"))

                    if show_items.get('updated', False):
                        all_badges.append(_badge(updated_label, "#0ea5e9"))

                    if all_badges:
                        st.markdown(" ".join(all_badges), unsafe_allow_html=True)

                # ファイル名を小さな文字で表示（オプション）
                if show_items.get('filename', False):
                    file_name = Path(video.current_full_path).name
                    row.markdown(f'<div style="color: #6b7280; font-size: 0.65em; line-height: 1.0; margin: 1px 2px 0; padding:0;">{file_name}</div>', unsafe_allow_html=True)

def play_video(video_id):
    """動画を再生"""
    result = st.session_state.video_manager.play_video(video_id)

    if result['status'] == 'success':
        st.success(result['message'])
    else:
        st.error(result['message'])


def render_random_play(selected_levels, selected_performers):
    """ランダム再生セクションの描画"""
    st.header("🎲 ランダム再生")

    col1, col2 = st.columns([3, 1])

    with col1:
        st.write("フィルタ条件に合う動画からランダムに1本選択して再生します。")

    with col2:
        if st.button("🎲 ランダム再生", use_container_width=True, type="primary"):
            video = st.session_state.video_manager.get_random_video(
                favorite_levels=selected_levels,
                performers=selected_performers
            )

            if video:
                st.session_state.selected_video = video
                st.info(f"選択された動画: {video.display_name}")
                _handle_play(video, trigger="random_play")
            else:
                st.warning("条件に合う動画が見つかりませんでした。")


def render_statistics():
    """統計情報の描画"""
    st.header("📊 視聴統計")

    # カウンターA/B/C表示
    st.subheader("🔢 視聴カウンター")
    st.caption("視聴回数をカウントするA/B/Cの3つのカウンターです。それぞれ独立してリセットできます。")

    counters = app_service.get_counters_with_counts()

    col_a, col_b, col_c = st.columns(3)

    for col, counter_data in zip([col_a, col_b, col_c], counters):
        with col:
            counter_id = counter_data['counter_id']
            count = counter_data['count']
            start_time = counter_data['start_time']

            with st.container(border=True):
                st.markdown(f"### カウンター {counter_id}")
                st.metric(label="視聴回数", value=f"{count} 回")

                if start_time:
                    if isinstance(start_time, str):
                        try:
                            start_time = datetime.fromisoformat(start_time)
                        except Exception:
                            start_time = None
                    if start_time and hasattr(start_time, 'strftime'):
                        st.caption(f"開始: {start_time.strftime('%Y-%m-%d %H:%M')}")
                else:
                    st.caption("未開始")

                if st.button(f"🔄 リセット", key=f"reset_counter_{counter_id}", use_container_width=True):
                    app_service.reset_counter(counter_id)
                    st.rerun()

    st.markdown("---")

    stats = st.session_state.video_manager.get_viewing_stats()

    if not stats['top_viewed']:
        st.info("視聴履歴がありません。")
        return

    st.subheader("視聴回数ランキング（全件）")

    col_filter, col_sort = st.columns([2, 1])
    with col_filter:
        min_view = st.number_input(
            "最小視聴回数で絞り込み",
            min_value=0,
            value=0,
            step=1,
            help="0 を指定すると全件表示されます。",
        )
        st.session_state.last_min_view_filter = min_view
    with col_sort:
        order = st.radio(
            "並び順",
            options=["視聴回数降順", "視聴回数昇順"],
            index=0,
            horizontal=True,
        )
        st.session_state.last_order_filter = order

    filtered = [r for r in stats['top_viewed'] if r['view_count'] >= min_view]
    reverse = order == "視聴回数降順"
    filtered = sorted(filtered, key=lambda x: x['view_count'], reverse=reverse)

    st.caption(f"{len(filtered)} 件表示（全 {len(stats['top_viewed'])} 件）")

    if filtered:
        top_df = pd.DataFrame(filtered)
        top_df.columns = ['ID', 'ファイル名', '視聴回数']
        st.dataframe(top_df, use_container_width=True, hide_index=True, height=480)
    else:
        st.info("条件に一致する動画がありません。")


def render_forgotten_favorites():
    """最近見ていないお気に入りだけを独立タブで表示"""
    st.header("🕰 最近見ていないお気に入り")
    st.caption("視聴回数5回以上、かつ30日以上未視聴")

    stats = st.session_state.video_manager.get_viewing_stats()

    if stats['forgotten_favorites']:
        forgotten_df = pd.DataFrame(stats['forgotten_favorites'])
        forgotten_df.columns = ['ID', 'ファイル名', '視聴回数', '最終視聴日']
        st.dataframe(forgotten_df, use_container_width=True, hide_index=True)
    else:
        st.info("該当する動画がありません。")


def render_settings():
    """設定タブの描画"""
    st.header("⚙️ 設定")

    current_config = st.session_state.user_config
    library_text = "\n".join(current_config.get("library_roots", []))
    default_player = current_config.get("default_player", "vlc")
    db_path_value = current_config.get("db_path", str(DATABASE_PATH))
    show_unavailable = current_config.get("show_unavailable", False)
    show_deleted = current_config.get("show_deleted", False)

    with st.form("settings_form"):
        libs_input = st.text_area(
            "ライブラリディレクトリ（1行1パス）",
            library_text,
            height=140,
            help="スキャン対象のフォルダを1行ずつ指定します。",
        )
        player_input = st.radio(
            "既定のプレイヤー",
            options=["vlc", "gom"],
            index=0 if default_player == "vlc" else 1,
            horizontal=True,
        )
        db_path_input = st.text_input(
            "データベースパス",
            db_path_value,
            help="SQLite データベースファイルへのパス",
        )

        st.markdown("---")
        st.subheader("表示オプション")

        show_unavailable_input = st.checkbox(
            "利用不可のファイルも表示",
            value=show_unavailable,
            help="ファイルが見つからない動画も一覧に表示します（外付けHDD未接続時など）",
        )

        show_deleted_input = st.checkbox(
            "削除済みファイルも表示",
            value=show_deleted,
            help="論理削除された動画も一覧に表示します",
        )

        submitted = st.form_submit_button("💾 保存", use_container_width=True)

        if submitted:
            new_roots = [line.strip() for line in libs_input.splitlines() if line.strip()]
            new_config = {
                "library_roots": new_roots or current_config.get("library_roots", []),
                "default_player": player_input,
                "db_path": db_path_input.strip() or db_path_value,
                "show_unavailable": show_unavailable_input,
                "show_deleted": show_deleted_input,
            }
            app_service.save_user_config(new_config)
            st.session_state.user_config = new_config
            with st.spinner("設定を反映中（スキャンを実行）..."):
                try:
                    scan_files_for_settings()
                    st.success("設定を保存し、ライブラリを再スキャンしました。")
                except Exception as e:
                    st.error(f"設定保存は完了しましたがスキャンに失敗しました: {e}")
            st.rerun()


def render_snapshot():
    """スナップショット取得タブ"""
    st.header("📸 スナップショット")
    st.caption("現在のデータベース・設定・統計を data/snapshots/YYYYMMDD_HHMM.db に保存します。")

    # 現在のフィルタ状態を保持
    current_filters = {
        "favorite_levels": st.session_state.get("last_selected_levels"),
        "performers": st.session_state.get("last_selected_performers"),
        "storage_locations": st.session_state.get("last_selected_locations"),
        "min_view_filter": st.session_state.get("last_min_view_filter"),
        "order_filter": st.session_state.get("last_order_filter"),
    }

    if st.button("📥 今すぐ取得", type="primary", use_container_width=True):
        with st.spinner("スナップショットを作成中..."):
            try:
                path = app_service.create_snapshot(current_filters, st.session_state.user_config)
                st.success(f"スナップショットを作成しました: {path}")
            except Exception as e:
                st.error(f"スナップショット作成に失敗しました: {e}")

    st.markdown("---")
    st.subheader("スナップショット比較（差分チェック）")

    snaps = app_service.list_snapshots()
    if len(snaps) < 2:
        st.info("比較には少なくとも2つのスナップショットが必要です。")
        return

    snap_options = [snap.name for snap in snaps]
    col_a, col_b = st.columns(2)
    with col_a:
        sel_old = st.selectbox("旧スナップショット", snap_options, index=1 if len(snap_options) > 1 else 0)
    with col_b:
        sel_new = st.selectbox("新スナップショット", snap_options, index=0)

    if st.button("🔍 比較する", use_container_width=True):
        old_path = next(p for p in snaps if p.name == sel_old)
        new_path = next(p for p in snaps if p.name == sel_new)
        with st.spinner("比較中..."):
            try:
                diff = app_service.compare_snapshots(old_path, new_path)
                st.success("比較が完了しました。")

                st.write(f"総動画数差分: {diff['total_videos_diff']} (旧 {diff['old']['total_videos']} → 新 {diff['new']['total_videos']})")
                st.write(f"総視聴回数差分: {diff['total_views_diff']} (旧 {diff['old']['total_views']} → 新 {diff['new']['total_views']})")

                st.markdown("#### 視聴回数が変化した動画（上位20件、絶対値ソート）")
                changed = diff['changed'][:20]
                if changed:
                    st.dataframe(changed, use_container_width=True)
                else:
                    st.info("視聴回数に変化はありません。")

                st.markdown("#### 新規に追加された動画")
                if diff['new_only']:
                    st.dataframe(diff['new_only'], use_container_width=True, height=200)
                else:
                    st.info("新規追加なし。")

                st.markdown("#### 旧にあって新に無い動画")
                if diff['missing']:
                    st.dataframe(diff['missing'], use_container_width=True, height=200)
                else:
                    st.info("削除・欠落はありません。")

            except Exception as e:
                st.error(f"比較に失敗しました: {e}")


def main():
    """メインアプリケーション"""
    init_session_state()
    check_and_init_database()

    # サイドバー
    selected_levels, selected_performers, selected_locations, availability_filter = render_sidebar()

    # メインエリア
    st.title("🎬 ClipBox - 動画管理システム")

    # タブ構成
    tab1, tab2, tab3, tab4, tab5, tab6 = st.tabs([
        "📁 動画一覧",
        "🎲 ランダム再生",
        "📊 統計",
        "🕰 最近見ていないお気に入り",
        "📸 スナップショット",
        "⚙️ 設定",
    ])

    with tab1:
        st.header("📁 動画一覧")

        # 表示設定セクション
        with st.expander("⚙️ 表示設定", expanded=False):
            st.subheader("表示項目")
            item_col1, item_col2, item_col3 = st.columns(3)

            with item_col1:
                st.session_state.display_settings['level'] = st.checkbox(
                    "レベルバッジ",
                    value=st.session_state.display_settings.get('level', True),
                    key="chk_level"
                )
                st.session_state.display_settings['available'] = st.checkbox(
                    "利用可否バッジ",
                    value=st.session_state.display_settings.get('available', True),
                    key="chk_available"
                )
                st.session_state.display_settings['view_count'] = st.checkbox(
                    "視聴回数バッジ",
                    value=st.session_state.display_settings.get('view_count', False),
                    key="chk_view_count"
                )

            with item_col2:
                st.session_state.display_settings['storage'] = st.checkbox(
                    "保存場所バッジ",
                    value=st.session_state.display_settings.get('storage', False),
                    key="chk_storage"
                )
                st.session_state.display_settings['file_size'] = st.checkbox(
                    "ファイルサイズバッジ",
                    value=st.session_state.display_settings.get('file_size', False),
                    key="chk_file_size"
                )

            with item_col3:
                st.session_state.display_settings['updated'] = st.checkbox(
                    "更新日時バッジ",
                    value=st.session_state.display_settings.get('updated', False),
                    key="chk_updated"
                )
                st.session_state.display_settings['filename'] = st.checkbox(
                    "ファイル名表示",
                    value=st.session_state.display_settings.get('filename', False),
                    key="chk_filename"
                )

            st.subheader("タイトル表示設定")
            st.session_state.title_max_length = st.number_input(
                "タイトル最大文字数",
                min_value=10,
                max_value=200,
                value=st.session_state.title_max_length,
                step=5,
                help="タイトルの表示文字数を制限します。省略された場合は「...」で表示されます。",
                key="title_max_length_input"
            )

        # タイトル検索とレイアウト設定
        col_top1, col_top2, col_top3 = st.columns([2, 2, 2])
        with col_top1:
            st.session_state.search_keyword = st.text_input(
                "🔍 タイトル検索",
                value=st.session_state.search_keyword,
                placeholder="タイトルで検索...",
                key="search_input",
                help="タイトルで部分一致検索（全角半角・大文字小文字・カナ差を自動吸収）"
            )

        with col_top2:
            col_count = st.radio(
                "表示カラム数",
                [1, 2, 3, 4, 5, 6],
                horizontal=True,
                index=3,
                help="一覧の密度を調整します"
            )
        with col_top3:
            sort_option = st.selectbox(
                "並び順（一覧）",
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

        # 動画を取得
        show_unavailable = availability_filter != "available"
        show_deleted = st.session_state.user_config.get("show_deleted", False)

        videos = st.session_state.video_manager.get_videos(
            favorite_levels=selected_levels,
            performers=selected_performers,
            storage_locations=selected_locations,
            availability=availability_filter if availability_filter != "all" else None,
            show_unavailable=show_unavailable,
            show_deleted=show_deleted
        )
        st.session_state.last_selected_levels = selected_levels
        st.session_state.last_selected_performers = selected_performers
        st.session_state.last_selected_locations = selected_locations

        # タイトル検索でフィルタリング
        original_count = len(videos)
        if st.session_state.search_keyword.strip():
            search_normalized = _normalize_text(st.session_state.search_keyword)
            videos = [v for v in videos if search_normalized in _normalize_text(v.essential_filename)]

        # 検索結果表示
        if st.session_state.search_keyword.strip():
            st.write(f"検索結果: {len(videos)} 件（全 {original_count} 件）")
        else:
            st.write(f"該当動画数: {len(videos)} 本")

        # 動画一覧を描画
        render_video_list(
            videos,
            sort_option=sort_option,
            col_count=col_count,
            show_items=st.session_state.display_settings,
            title_max_length=st.session_state.title_max_length
        )

    with tab2:
        render_random_play(selected_levels, selected_performers)

    with tab3:
        render_statistics()

    with tab4:
        render_forgotten_favorites()

    with tab5:
        render_snapshot()

    with tab6:
        render_settings()

    # フッター
    st.markdown("---")
    st.caption("ClipBox v0.1.0 - 動画管理システム")


if __name__ == "__main__":
    main()
