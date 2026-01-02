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

from core.database import init_database, check_database_exists, get_db_connection
from core.video_manager import VideoManager
from core.scanner import FileScanner, detect_recently_accessed_files
from core.settings import get_last_access_check_time, update_last_access_check_time
from core import config_store
from core import history_repository
from core import snapshot
from core import counter_service
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
        last_check_time = get_last_access_check_time()

        # 最近アクセスされたファイルを検知
        with get_db_connection() as conn:
            accessed_files = detect_recently_accessed_files(last_check_time, conn)

        # 検知した件数を表示
        if accessed_files:
            # 視聴履歴に記録
            video_manager = VideoManager()
            recorded_count = video_manager.record_file_access_as_viewing(accessed_files)

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
        update_last_access_check_time()

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
        history_repository.insert_play_history(
            file_path=str(file_path),
            title=video.essential_filename,
            player=player,
            library_root=library_root,
            trigger=trigger,
            video_id=video.id,
            internal_id=internal_id,
        )
        st.session_state.selected_video = video
        st.success(f"再生を開始しました: {video.essential_filename}")
    except Exception as e:
        st.error(f"再生履歴の記録に失敗しました: {e}")


def _handle_judgment(video, new_level: int):
    """
    お気に入りレベルを変更するヘルパー。
    成功時は st.success、失敗時は st.error を出す。
    """
    result = st.session_state.video_manager.set_favorite_level(video.id, new_level)

    if result.get("status") == "success":
        st.success(result.get("message", "レベルを更新しました"))
        st.rerun()
    else:
        st.error(result.get("message", "レベル更新に失敗しました"))


def init_session_state():
    """セッション状態の初期化"""
    if "user_config" not in st.session_state:
        st.session_state.user_config = config_store.load_user_config()
    if 'initialized' not in st.session_state:
        st.session_state.initialized = False
    if 'video_manager' not in st.session_state:
        st.session_state.video_manager = VideoManager()
    if 'selected_video' not in st.session_state:
        st.session_state.selected_video = None

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

def _level_to_star(level: int) -> str:
    # 旧称を流用しているが内容は数値バッジ用に置き換え
    level = max(0, min(4, level))
    return f"Lv{level}"

def _badge(label: str, color: str) -> str:
    return f'<span class="cb-badge" style="background:{color}; padding:4px 4px; margin:0 4px 4px 0; border-radius:6px; font-size:0.85em; box-shadow:0 1px 3px rgba(0,0,0,0.2); display:inline-block; color:white; font-weight:500;">{label}</span>'

def check_and_init_database():
    """データベースの確認と初期化"""
    # 既存DBでも不足テーブルを補うため毎回 init_database を実行（CREATE IF NOT EXISTS で安全）
    init_database()
    if not check_database_exists():
        st.error(f"データベースが見つかりません: {DATABASE_PATH}")
        st.info("セットアップスクリプトを実行してください:")
        st.code("python setup_db.py", language="bash")
        st.stop()

    # 既存DBでも新規テーブルを追加するため毎回初期化を実行
    try:
        init_database()
    except Exception as e:
        st.error(f"データベース初期化に失敗しました: {e}")
        st.stop()


def get_filter_options():
    """フィルタオプションを取得"""
    with get_db_connection() as conn:
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
    st.sidebar.markdown("---")

    # データベース情報
    with get_db_connection() as conn:
        cursor = conn.execute("SELECT COUNT(*) FROM videos")
        total_videos = cursor.fetchone()[0]
        cursor = conn.execute("SELECT COUNT(*) FROM viewing_history")
        total_views = cursor.fetchone()[0]

    st.sidebar.metric("総動画数", f"{total_videos} 本")
    st.sidebar.metric("総視聴回数", f"{total_views} 回")
    st.sidebar.markdown("---")

    # フィルタセクション
    st.sidebar.header("フィルタ")

    favorite_levels, performers, storage_locations = get_filter_options()

    # お気に入りレベルフィルタ
    if favorite_levels:
        level_options = {FAVORITE_LEVEL_NAMES.get(level, f"レベル{level}"): level
                        for level in favorite_levels}
        selected_levels = st.sidebar.multiselect(
            "お気に入りレベル",
            options=list(level_options.keys()),
            default=list(level_options.keys())
        )
        selected_level_values = [level_options[name] for name in selected_levels]
    else:
        selected_level_values = None

    # 登場人物フィルタ
    if performers:
        selected_performers = st.sidebar.multiselect(
            "登場人物",
            options=performers,
            default=performers
        )
    else:
        selected_performers = None

    # 保存場所フィルタ
    if storage_locations:
        location_names = {
            'C_DRIVE': 'Cドライブ',
            'EXTERNAL_HDD': '外付けHDD'
        }
        location_options = [location_names.get(loc, loc) for loc in storage_locations]
        selected_locations = st.sidebar.multiselect(
            "保存場所",
            options=location_options,
            default=location_options
        )
        # 逆変換
        reverse_location_names = {v: k for k, v in location_names.items()}
        selected_location_values = [reverse_location_names.get(name, name)
                                   for name in selected_locations]
    else:
        selected_location_values = None

    st.sidebar.markdown("---")

    # ファイルスキャン
    st.sidebar.header("ファイルスキャン")
    if st.sidebar.button("📁 ファイルをスキャン", use_container_width=True):
        scan_files()

    # 視聴履歴検知
    st.sidebar.markdown("---")
    st.sidebar.header("視聴履歴検知")
    if st.sidebar.button("📊 視聴履歴を検知", use_container_width=True):
        # 誤クリック防止の簡易確認
        if st.sidebar.checkbox("実行してよい（確認）", key="confirm_detect", value=False):
            detect_and_record_file_access()
            st.rerun()
        else:
            st.sidebar.warning("実行にはチェックが必要です。")

    return selected_level_values, selected_performers, selected_location_values


def scan_files():
    """ファイルスキャン実行"""
    with st.spinner("ファイルをスキャン中..."):
        try:
            library_roots = [Path(p) for p in st.session_state.user_config.get("library_roots", SCAN_DIRECTORIES)]
            scanner = FileScanner(library_roots)
            with get_db_connection() as conn:
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
    scanner = FileScanner(library_roots)
    with get_db_connection() as conn:
        scanner.scan_and_update(conn)


def render_video_list(videos, sort_option: str | None = None, col_count: int = 2):
    """動画一覧の描画（カラム数可変、情報をコンパクトに表示）"""
    if not videos:
        st.info("条件に合う動画が見つかりませんでした。")
        return

    # 視聴回数と最終視聴
    with get_db_connection() as conn:
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

    for i in range(0, len(videos), col_count):
        cols = st.columns(col_count)
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
                row = st.container(border=True)
                top_left, top_right = row.columns([7, 3])
                with top_left:
                    # タイトル
                    if video.is_available:
                        title_style = ""
                    else:
                        title_style = ' style="opacity: 0.5; color: #9ca3af;"'

                    st.markdown(f'<span{title_style}><strong>{video.essential_filename}</strong></span>', unsafe_allow_html=True)

                    # すべてのバッジを1行に（自動改行あり）
                    all_badges = [
                        _badge("✅ 利用可能", "#10b981") if video.is_available else _badge("❌ 利用不可", "#ef4444"),
                        _badge(_level_to_star(video.current_favorite_level), level_colors.get(video.current_favorite_level, "#d1d5db")),
                        _badge(f"視聴 {view_count} 回", "#f97316"),
                        _badge(storage_label, "#2563eb"),
                        _badge(size_label, "#475569"),
                        _badge(f"更新 {updated_label}", "#0ea5e9"),
                    ]

                    st.markdown(" ".join(all_badges), unsafe_allow_html=True)

                    # ファイル名を小さな文字で表示
                    file_name = Path(video.current_full_path).name
                    st.markdown(f'<div style="color: #6b7280; font-size: 0.7em; line-height: 1.1 !important; margin-top: 2px;">{file_name}</div>', unsafe_allow_html=True)

                with top_right:
                    level_key = f"judge_level_{video.id}"
                    default_level = video.current_favorite_level if video.current_favorite_level in level_labels else 0
                    is_disabled = not video.is_available

                    selected = st.radio(
                        "判定",
                        options=[4, 3, 2, 1, 0],
                        format_func=lambda v: level_labels[v],
                        horizontal=True,
                        key=level_key,
                        index=[4, 3, 2, 1, 0].index(default_level),
                        label_visibility="collapsed",
                        disabled=is_disabled,
                    )
                    if st.button("判定", key=f"judge_{video.id}", use_container_width=True, disabled=is_disabled):
                        _handle_judgment(video, selected)
                    if st.button("▶️ 再生", key=f"play_{video.id}", use_container_width=True, disabled=is_disabled):
                        _handle_play(video, trigger="row_button")

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

    counters = counter_service.get_counters_with_counts()

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
                    counter_service.reset_counter(counter_id)
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
            config_store.save_user_config(new_config)
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
                path = snapshot.create_snapshot(current_filters, st.session_state.user_config)
                st.success(f"スナップショットを作成しました: {path}")
            except Exception as e:
                st.error(f"スナップショット作成に失敗しました: {e}")

    st.markdown("---")
    st.subheader("スナップショット比較（差分チェック）")

    snaps = snapshot.list_snapshots()
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
                diff = snapshot.compare_snapshots(old_path, new_path)
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
    selected_levels, selected_performers, selected_locations = render_sidebar()

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

        col_top1, col_top2 = st.columns([2, 2])
        with col_top1:
            col_count = st.radio(
                "表示カラム数",
                [1, 2, 3, 4, 5, 6],
                horizontal=True,
                index=3,
                help="一覧の密度を調整します"
            )
        with col_top2:
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
        show_unavailable = st.session_state.user_config.get("show_unavailable", False)
        show_deleted = st.session_state.user_config.get("show_deleted", False)

        videos = st.session_state.video_manager.get_videos(
            favorite_levels=selected_levels,
            performers=selected_performers,
            storage_locations=selected_locations,
            show_unavailable=show_unavailable,
            show_deleted=show_deleted
        )
        st.session_state.last_selected_levels = selected_levels
        st.session_state.last_selected_performers = selected_performers
        st.session_state.last_selected_locations = selected_locations

        st.write(f"該当動画数: {len(videos)} 本")
        render_video_list(videos, sort_option=sort_option, col_count=col_count)

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
