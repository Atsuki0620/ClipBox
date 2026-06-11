"""
ClipBox API - 統計・ランキングエンドポイントのテスト。
"""

from core.database import get_db_connection


def _insert(essential, path, level, *, needs_sel=0):
    with get_db_connection() as conn:
        conn.execute(
            """
            INSERT INTO videos (essential_filename, current_full_path, current_favorite_level,
                                storage_location, is_available, is_deleted, needs_selection)
            VALUES (?, ?, ?, 'C_DRIVE', 1, 0, ?)
            """,
            (essential, path, level, needs_sel),
        )
        return conn.execute(
            "SELECT id FROM videos WHERE essential_filename = ?", (essential,)
        ).fetchone()[0]


def test_stats_kpi(client):
    """未判定/判定済み/判定率を返す。"""
    _insert("a.mp4", "C:/x/a.mp4", -1)        # 未判定
    _insert("b.mp4", "C:/x/###_b.mp4", 3)     # 判定済み

    body = client.get("/api/stats/kpi").json()
    assert body["unrated_count"] == 1
    assert body["judged_count"] == 1
    assert body["judged_rate"] == 50.0


def test_stats_selection_kpi_global_when_unset(client):
    """folder 未指定かつ config 未設定なら全体セレクション KPI を返す。"""
    _insert("s.mp4", "C:/x/!s.mp4", -1, needs_sel=1)
    body = client.get("/api/stats/selection-kpi").json()
    assert body["unselected_count"] == 1


def test_stats_view_counts_and_last_viewed(client):
    """視聴回数マップと最終視聴日時マップを返す（キーは文字列化される）。"""
    a = _insert("a.mp4", "C:/x/a.mp4", 1)
    with get_db_connection() as conn:
        conn.execute(
            "INSERT INTO viewing_history (video_id, viewed_at, viewing_method)"
            " VALUES (?, '2026-05-01 12:00:00', 'APP_PLAYBACK')", (a,))
        conn.execute(
            "INSERT INTO viewing_history (video_id, viewed_at, viewing_method)"
            " VALUES (?, '2026-05-02 12:00:00', 'APP_PLAYBACK')", (a,))

    assert client.get("/api/stats/view-counts").json()[str(a)] == 2
    assert client.get("/api/stats/last-viewed").json()[str(a)] == "2026-05-02 12:00:00"


def test_ranking_view_count_nests_video(client):
    """ランキングは {rank, video, score} を返し視聴回数降順に並ぶ。"""
    _insert("a.mp4", "C:/x/###_a.mp4", 3)
    b = _insert("b.mp4", "C:/x/###_b.mp4", 3)
    a_id = client.get("/api/videos/search", params={"keyword": "a.mp4"}).json()[0]["id"]
    with get_db_connection() as conn:
        for _ in range(3):
            conn.execute(
                "INSERT INTO viewing_history (video_id, viewed_at, viewing_method)"
                " VALUES (?, datetime('now'), 'APP_PLAYBACK')", (a_id,))
        conn.execute(
            "INSERT INTO viewing_history (video_id, viewed_at, viewing_method)"
            " VALUES (?, datetime('now'), 'APP_PLAYBACK')", (b,))

    body = client.get("/api/ranking",
                      params={"type": "view_count", "period": "全期間", "top_n": 10}).json()
    assert body["items"][0]["rank"] == 1
    assert body["items"][0]["video"]["essential_filename"] == "a.mp4"
    assert body["items"][0]["score"] == 3


def test_ranking_invalid_period_422(client):
    """不正な period は core の KeyError ではなく 422 に寄せる。"""
    r = client.get("/api/ranking", params={"type": "view_count", "period": "bogus"})
    assert r.status_code == 422


# --- 総合（composite）スコア式（SPEC_NEXTJS.md §9 の不変条件を固定）---
# score = round((view_days*1 + likes*3) * (1 + 0.5*T1 + 0.3*T2) * 100)
# T1 = 判定済み(level>=0), T2 = 選別済み(is_selection_completed)。score=0 は除外。

def _set_selection_completed(video_id):
    with get_db_connection() as conn:
        conn.execute(
            "UPDATE videos SET is_selection_completed = 1 WHERE id = ?", (video_id,))


def _add_view_day(video_id, date_str):
    with get_db_connection() as conn:
        conn.execute(
            "INSERT INTO viewing_history (video_id, viewed_at, viewing_method)"
            " VALUES (?, ?, 'APP_PLAYBACK')", (video_id, date_str))


def _add_like(video_id, liked_at="2026-05-01 00:00:00"):
    with get_db_connection() as conn:
        conn.execute(
            "INSERT INTO likes (video_id, liked_at) VALUES (?, ?)", (video_id, liked_at))


def test_ranking_composite_exact_score(client):
    """総合スコアの正確値を固定: 視聴日数2・いいね1・T1・T2 → round((2+3)*1.8*100)=900。"""
    vid = _insert("a.mp4", "C:/x/+###_a.mp4", 3)  # Lv3＋選別済み(`+`) → T1=1
    _set_selection_completed(vid)                 # T2=1（DBカラムをプレフィックスと同期）
    _add_view_day(vid, "2026-05-01 12:00:00")    # 異なる2日付 → view_days=2
    _add_view_day(vid, "2026-05-02 12:00:00")
    _add_like(vid)                               # like_count=1

    body = client.get("/api/ranking",
                      params={"type": "composite", "period": "全期間", "top_n": 10}).json()
    assert body["items"][0]["video"]["essential_filename"] == "a.mp4"
    # base = 2*1 + 1*3 = 5 ; bonus = 1 + 0.5 + 0.3 = 1.8 ; score = round(5*1.8*100) = 900
    assert body["items"][0]["score"] == 900


def test_ranking_composite_excludes_zero_score(client):
    """視聴日数もいいねも無い動画は base=0 → score=0 で結果から除外される。"""
    _insert("empty.mp4", "C:/x/###_empty.mp4", 3)  # 判定済みだが履歴・いいね無し
    scored = _insert("b.mp4", "C:/x/###_b.mp4", 3)
    _add_view_day(scored, "2026-05-01 12:00:00")

    body = client.get("/api/ranking",
                      params={"type": "composite", "period": "全期間", "top_n": 10}).json()
    names = [it["video"]["essential_filename"] for it in body["items"]]
    assert "b.mp4" in names
    assert "empty.mp4" not in names


def test_ranking_composite_bonus_ordering(client):
    """同じ素点でも T1/T2 ボーナスでスコアが上がる（未判定 < 判定済み < 選別済み）。"""
    # いずれも view_days=1・likes=0 → base=1。bonus だけで差が付く。
    unjudged = _insert("u.mp4", "C:/x/u.mp4", -1)        # T1=0,T2=0 → 1*1.0*100=100
    judged = _insert("j.mp4", "C:/x/###_j.mp4", 3)       # T1=1,T2=0 → 1*1.5*100=150
    selected = _insert("s.mp4", "C:/x/+###_s.mp4", 3)    # T1=1,T2=1 → 1*1.8*100=180
    _set_selection_completed(selected)
    for v in (unjudged, judged, selected):
        _add_view_day(v, "2026-05-01 12:00:00")

    body = client.get("/api/ranking",
                      params={"type": "composite", "period": "全期間", "top_n": 10}).json()
    by_name = {it["video"]["essential_filename"]: it["score"] for it in body["items"]}
    assert by_name["s.mp4"] == 180
    assert by_name["j.mp4"] == 150
    assert by_name["u.mp4"] == 100
    # 並び順はスコア降順
    order = [it["video"]["essential_filename"] for it in body["items"]]
    assert order.index("s.mp4") < order.index("j.mp4") < order.index("u.mp4")
