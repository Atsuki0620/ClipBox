"""
ClipBox API - 分析エンドポイントのテスト。

DataFrame 由来レスポンスの JSON 化、ランキングの score 列マッピング、
不正 period の 422、履歴/応答時間/トレンド/分布を検証する。
"""

from core.database import get_db_connection


def _seed():
    """videos / viewing_history / judgment_history / likes を投入し id を返す。"""
    with get_db_connection() as conn:
        conn.execute(
            "INSERT INTO videos (id, essential_filename, current_full_path, current_favorite_level,"
            " storage_location, is_available, is_deleted, file_created_at)"
            " VALUES (1, 'a.mp4', 'C:/x/###_a.mp4', 3, 'C_DRIVE', 1, 0, '2026-01-01')"
        )
        conn.execute(
            "INSERT INTO videos (id, essential_filename, current_full_path, current_favorite_level,"
            " storage_location, is_available, is_deleted, file_created_at)"
            " VALUES (2, 'b.mp4', 'C:/x/####_b.mp4', 4, 'EXTERNAL_HDD', 1, 0, NULL)"
        )
        # 視聴: a=3回, b=1回
        for _ in range(3):
            conn.execute(
                "INSERT INTO viewing_history (video_id, viewed_at, viewing_method)"
                " VALUES (1, datetime('now'), 'APP_PLAYBACK')"
            )
        conn.execute(
            "INSERT INTO viewing_history (video_id, viewed_at, viewing_method)"
            " VALUES (2, datetime('now'), 'APP_PLAYBACK')"
        )
        conn.execute(
            "INSERT INTO viewing_history (video_id, viewed_at, viewing_method)"
            " VALUES (1, datetime('now'), 'FILE_ACCESS_DETECTED')"
        )
        conn.execute(
            "INSERT INTO viewing_history (video_id, viewed_at, viewing_method)"
            " VALUES (1, datetime('now'), 'MANUAL_ENTRY')"
        )
        # 判定履歴: a=通常判定(応答時間あり), b=セレクション判定
        conn.execute(
            "INSERT INTO judgment_history (video_id, old_level, new_level, judged_at,"
            " rename_duration_ms, storage_location, was_selection_judgment)"
            " VALUES (1, -1, 3, datetime('now'), 1200, 'C_DRIVE', 0)"
        )
        conn.execute(
            "INSERT INTO judgment_history (video_id, old_level, new_level, judged_at, was_selection_judgment)"
            " VALUES (2, -1, 4, datetime('now'), 1)"
        )
        # いいね: a=2, b=1
        for _ in range(2):
            conn.execute("INSERT INTO likes (video_id, liked_at) VALUES (1, datetime('now'))")
        conn.execute("INSERT INTO likes (video_id, liked_at) VALUES (2, datetime('now'))")


def test_analysis_data_serializes(client):
    """基礎データが JSON 化され、期間内視聴回数を含む。"""
    _seed()
    body = client.get("/api/analysis/data", params={"period": "全期間"}).json()
    assert body["total"] == 2
    by_id = {rec["id"]: rec for rec in body["items"]}
    assert by_id[1]["period_view_count"] == 3


def test_analysis_rankings_view_count(client):
    """kind=view_count は視聴回数を score に落とし降順に並ぶ（型付き snake_case）。"""
    _seed()
    body = client.get("/api/analysis/rankings", params={"kind": "view_count", "period": "全期間"}).json()
    assert body["kind"] == "view_count"
    top = body["items"][0]
    assert top["rank"] == 1
    assert "a.mp4" in top["filename"]
    assert top["score"] == 3
    assert top["is_available"] is True
    assert top["favorite_level"] == 3


def test_analysis_rankings_likes_score_mapping(client):
    """kind=likes は いいね数 列を score に正しくマップする。"""
    _seed()
    body = client.get("/api/analysis/rankings", params={"kind": "likes", "period": "全期間"}).json()
    assert body["kind"] == "likes"
    assert body["items"][0]["score"] == 2  # a=2いいね


def test_analysis_rankings_invalid_period_422(client):
    """不正な period は 422。"""
    r = client.get("/api/analysis/rankings", params={"kind": "view_count", "period": "bogus"})
    assert r.status_code == 422


def test_analysis_custom_period_requires_dates_422(client):
    """period=カスタム で start/end 欠如は 422。"""
    r = client.get("/api/analysis/data", params={"period": "カスタム"})
    assert r.status_code == 422


def test_viewing_and_judgment_history(client):
    """生視聴履歴は旧methodも含め、判定履歴とともに video_ids で絞り込まれる。"""
    _seed()
    vh = client.get("/api/analysis/viewing-history", params={"video_ids": "1"}).json()
    assert len(vh) == 5
    assert all(item["video_id"] == 1 for item in vh)

    jh = client.get("/api/analysis/judgment-history", params={"video_ids": "1"}).json()
    assert len(jh) == 1
    assert jh[0]["video_id"] == 1


def test_viewing_trend_counts(client):
    """視聴トレンドは APP_PLAYBACK だけをサーバー集計する。"""
    _seed()
    body = client.get("/api/analysis/viewing-trend", params={"period": "全期間", "bucket": "day"}).json()
    assert sum(item["count"] for item in body) == 4  # a=3 + b=1


def test_judgment_trend_week_distinct(client):
    """同一動画が同一週に複数日判定でも、週バケットの count は distinct=1。"""
    with get_db_connection() as conn:
        conn.execute(
            "INSERT INTO videos (id, essential_filename, current_full_path, current_favorite_level,"
            " storage_location, is_available, is_deleted) VALUES (1, 'a.mp4', 'C:/a.mp4', 3, 'C_DRIVE', 1, 0)"
        )
        # 2026-06-08(月) と 2026-06-09(火) は同一週（月曜開始）
        conn.execute(
            "INSERT INTO judgment_history (video_id, old_level, new_level, judged_at, was_selection_judgment)"
            " VALUES (1, -1, 3, '2026-06-08 12:00:00', 0)"
        )
        conn.execute(
            "INSERT INTO judgment_history (video_id, old_level, new_level, judged_at, was_selection_judgment)"
            " VALUES (1, -1, 3, '2026-06-09 12:00:00', 0)"
        )

    body = client.get(
        "/api/analysis/judgment-trend", params={"period": "全期間", "bucket": "week"}
    ).json()
    assert len(body) == 1
    assert body[0]["count"] == 1


def test_response_time(client):
    """応答時間データが返る。"""
    _seed()
    body = client.get("/api/analysis/response-time").json()
    assert len(body) == 1
    assert body[0]["duration_ms"] == 1200
    assert body[0]["storage"] == "C_DRIVE"


def test_selection_trend_and_distribution(client):
    """セレクション判定のトレンド・分布が返る。"""
    _seed()
    trend = client.get("/api/analysis/selection-trend").json()
    assert sum(item["count"] for item in trend) == 1

    dist = client.get("/api/analysis/selection-distribution").json()
    assert {item["level"]: item["count"] for item in dist} == {4: 1}
