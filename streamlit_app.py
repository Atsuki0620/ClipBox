"""
ClipBox - メインアプリケーション（UI層）
Streamlitベースの動画管理インターフェース
"""

import streamlit as st
import pandas as pd
from pathlib import Path
from datetime import datetime

from core.database import init_database, check_database_exists, get_db_connection
from core.video_manager import VideoManager
from core.scanner import FileScanner, detect_recently_accessed_files
from core.settings import get_last_access_check_time, update_last_access_check_time
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


def init_session_state():
    """セッション状態の初期化"""
    if 'initialized' not in st.session_state:
        st.session_state.initialized = False
    if 'video_manager' not in st.session_state:
        st.session_state.video_manager = VideoManager()
    if 'selected_video' not in st.session_state:
        st.session_state.selected_video = None

    # 起動時に自動でファイルアクセスを検知（初回のみ）
    if 'auto_detection_done' not in st.session_state:
        st.session_state.auto_detection_done = False

    if not st.session_state.auto_detection_done:
        detect_and_record_file_access()
        st.session_state.auto_detection_done = True


def check_and_init_database():
    """データベースの確認と初期化"""
    if not check_database_exists():
        st.error(f"データベースが見つかりません: {DATABASE_PATH}")
        st.info("セットアップスクリプトを実行してください:")
        st.code("python setup_db.py", language="bash")
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
        detect_and_record_file_access()
        st.rerun()

    return selected_level_values, selected_performers, selected_location_values


def scan_files():
    """ファイルスキャン実行"""
    with st.spinner("ファイルをスキャン中..."):
        try:
            scanner = FileScanner(SCAN_DIRECTORIES)
            with get_db_connection() as conn:
                scanner.scan_and_update(conn)
            st.success("ファイルスキャンが完了しました！")
            st.rerun()
        except Exception as e:
            st.error(f"スキャンエラー: {e}")


def render_video_list(videos):
    """動画一覧の描画"""
    if not videos:
        st.info("条件に合う動画が見つかりませんでした。")
        return

    # DataFrameに変換
    df_data = []
    for video in videos:
        df_data.append({
            "ID": video.id,
            "ファイル名": video.display_name,
            "お気に入り": FAVORITE_LEVEL_NAMES.get(video.current_favorite_level, f"レベル{video.current_favorite_level}"),
            "登場人物": video.performer or "未設定",
            "保存場所": "Cドライブ" if video.storage_location == "C_DRIVE" else "外付けHDD",
            "ファイルサイズ": f"{video.file_size / (1024*1024):.1f} MB" if video.file_size else "不明",
        })

    df = pd.DataFrame(df_data)

    # 動画一覧表示
    st.dataframe(
        df,
        use_container_width=True,
        hide_index=True,
        column_config={
            "ID": st.column_config.NumberColumn("ID", width="small"),
            "ファイル名": st.column_config.TextColumn("ファイル名", width="large"),
        }
    )

    # 動画選択と再生
    st.markdown("---")
    col1, col2 = st.columns([3, 1])

    with col1:
        selected_id = st.number_input(
            "再生する動画のIDを入力",
            min_value=1,
            max_value=len(videos),
            value=1,
            step=1
        )

    with col2:
        st.markdown("<br>", unsafe_allow_html=True)  # スペース調整
        if st.button("▶️ 再生", use_container_width=True):
            play_video(selected_id)


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
                play_video(video.id)
            else:
                st.warning("条件に合う動画が見つかりませんでした。")


def render_statistics():
    """統計情報の描画"""
    st.header("📊 視聴統計")

    stats = st.session_state.video_manager.get_viewing_stats()

    col1, col2 = st.columns(2)

    with col1:
        st.subheader("視聴回数ランキング TOP 10")
        if stats['top_viewed']:
            top_df = pd.DataFrame(stats['top_viewed'][:10])
            top_df.columns = ['ID', 'ファイル名', '視聴回数']
            st.dataframe(top_df, use_container_width=True, hide_index=True)
        else:
            st.info("視聴履歴がありません。")

    with col2:
        st.subheader("最近見ていないお気に入り")
        st.caption("視聴回数5回以上、かつ30日以上未視聴")
        if stats['forgotten_favorites']:
            forgotten_df = pd.DataFrame(stats['forgotten_favorites'])
            forgotten_df.columns = ['ID', 'ファイル名', '視聴回数', '最終視聴日']
            st.dataframe(forgotten_df, use_container_width=True, hide_index=True)
        else:
            st.info("該当する動画がありません。")


def main():
    """メインアプリケーション"""
    init_session_state()
    check_and_init_database()

    # サイドバー
    selected_levels, selected_performers, selected_locations = render_sidebar()

    # メインエリア
    st.title("🎬 ClipBox - 動画管理システム")

    # タブ構成
    tab1, tab2, tab3 = st.tabs(["📁 動画一覧", "🎲 ランダム再生", "📊 統計"])

    with tab1:
        st.header("📁 動画一覧")

        # 動画を取得
        videos = st.session_state.video_manager.get_videos(
            favorite_levels=selected_levels,
            performers=selected_performers,
            storage_locations=selected_locations
        )

        st.write(f"該当動画数: {len(videos)} 本")
        render_video_list(videos)

    with tab2:
        render_random_play(selected_levels, selected_performers)

    with tab3:
        render_statistics()

    # フッター
    st.markdown("---")
    st.caption("ClipBox v0.1.0 - 動画管理システム")


if __name__ == "__main__":
    main()
