"""
その他のタブ（統計・スナップショット・設定）UI
"""

import streamlit as st
import pandas as pd
from datetime import datetime

from core import app_service


def render_stats_tab():
    """統計タブ（カウンター/ランキング/忘れられ動画）"""
    st.subheader("⏱ カウンター A/B/C")
    counters = app_service.get_counters_with_counts()
    cols = st.columns(3)
    for col, c in zip(cols, counters):
        start_label = c["start_time"] if c["start_time"] else "未開始"
        col.metric(f"カウンター {c['counter_id']}", f"{c['count']} 回", help=f"開始: {start_label}")
        if col.button(f"リセット {c['counter_id']}", key=f"reset_{c['counter_id']}"):
            app_service.reset_counter(c["counter_id"], datetime.now())
            st.rerun()

    st.markdown("---")
    st.subheader("🏆 視聴回数ランキング")
    vm = st.session_state.video_manager
    stats = vm.get_viewing_stats()
    min_views = st.slider("最小視聴回数で絞り込み", 0, 20, 0)
    sort_option = st.selectbox("並び順", ["視聴回数:多い順", "視聴回数:少ない順"])
    ranking = stats.get("top_viewed", [])
    df_rank = pd.DataFrame(ranking)
    if not df_rank.empty:
        df_rank = df_rank[df_rank["view_count"] >= min_views]
        ascending = sort_option == "視聴回数:少ない順"
        df_rank = df_rank.sort_values("view_count", ascending=ascending)
        st.dataframe(
            df_rank.rename(columns={"id": "video_id", "essential_filename": "タイトル", "view_count": "視聴回数"}),
            use_container_width=True,
            height=400,
        )
    else:
        st.info("視聴履歴がありません。")

    st.markdown("---")
    st.subheader("🕰 よく見るけど最近見ていない動画")
    forgotten = stats.get("forgotten_favorites", [])
    if forgotten:
        st.dataframe(
            pd.DataFrame(forgotten).rename(
                columns={"id": "video_id", "essential_filename": "タイトル", "view_count": "視聴回数", "last_viewed": "最終視聴"}
            ),
            use_container_width=True,
            height=300,
        )
    else:
        st.info("該当なし。")


def render_snapshot_tab():
    """スナップショットタブ"""
    st.subheader("📸 スナップショット")
    snaps = app_service.list_snapshots()
    st.write(f"保存済み: {len(snaps)} 件")

    if st.button("スナップショットを取得", use_container_width=True):
        path = app_service.create_snapshot(filters={}, user_config=st.session_state.user_config)
        st.success(f"作成しました: {path.name}")
        st.rerun()

    snaps = app_service.list_snapshots()
    if len(snaps) >= 2:
        col1, col2 = st.columns(2)
        with col1:
            old = st.selectbox("古いスナップショット", snaps, format_func=lambda p: p.name)
        with col2:
            new = st.selectbox("新しいスナップショット", snaps, index=0, format_func=lambda p: p.name)

        if st.button("差分を比較", use_container_width=True):
            diff = app_service.compare_snapshots(old, new)
            st.metric("動画数差分", diff["total_videos_diff"])
            st.metric("視聴回数差分", diff["total_views_diff"])
            if diff["changed"]:
                st.write("視聴回数が変化した動画（上位）")
                st.dataframe(pd.DataFrame(diff["changed"]).head(30), use_container_width=True, height=400)
            else:
                st.info("視聴回数の変化はありません。")
    else:
        st.caption("比較には2件以上のスナップショットが必要です。")


def render_settings_tab(scan_files_for_settings):
    """設定タブ"""
    st.subheader("⚙ 設定")
    cfg = st.session_state.user_config

    library_roots_text = st.text_area(
        "ライブラリルート（行ごとにパス）",
        value="\n".join(cfg.get("library_roots", [])),
        height=120,
    )
    default_player = st.text_input("既定プレイヤー", value=cfg.get("default_player", "vlc"))

    if st.button("設定を保存", use_container_width=True):
        new_roots = [line.strip() for line in library_roots_text.splitlines() if line.strip()]
        cfg.update({"library_roots": new_roots, "default_player": default_player})
        app_service.save_user_config(cfg)
        st.success("設定を保存しました。")

    if st.button("保存後スキャンを実行", use_container_width=True):
        scan_files_for_settings()
        st.success("スキャン完了後に再描画します。")
        st.rerun()
