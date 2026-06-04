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
