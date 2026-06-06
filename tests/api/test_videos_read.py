"""
ClipBox API - 動画 read 系エンドポイント（単体・検索・ランダム・セレクション・選択肢・ソート）のテスト。
"""

from core.database import get_db_connection


def _insert(
    essential, path, level, *, performer="P", storage="C_DRIVE",
    available=1, deleted=0, needs_sel=0, sel_done=0,
):
    with get_db_connection() as conn:
        conn.execute(
            """
            INSERT INTO videos (essential_filename, current_full_path, current_favorite_level,
                                performer, storage_location, is_available, is_deleted,
                                needs_selection, is_selection_completed)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (essential, path, level, performer, storage, available, deleted, needs_sel, sel_done),
        )
        return conn.execute(
            "SELECT id FROM videos WHERE essential_filename = ?", (essential,)
        ).fetchone()[0]


def test_get_video_by_id_returns_including_deleted(client):
    """単体取得は削除済み動画も返す（現行踏襲）。"""
    vid = _insert("a.mp4", "C:/x/###_a.mp4", 3, deleted=1)
    body = client.get(f"/api/videos/{vid}").json()
    assert body["id"] == vid
    assert body["is_deleted"] is True


def test_get_video_by_id_404(client):
    """存在しないIDは 404。"""
    assert client.get("/api/videos/999999").status_code == 404


def test_search_normalizes_and_filters_storage(client):
    """全角/大小を吸収して部分一致し、storage で絞れる。"""
    _insert("Test.mp4", "C:/x/Test.mp4", 1, storage="C_DRIVE")
    _insert("hoge.mp4", "D:/y/hoge.mp4", 1, storage="EXTERNAL_HDD")

    names = [it["essential_filename"] for it in
             client.get("/api/videos/search", params={"keyword": "ｔｅｓｔ"}).json()]
    assert "Test.mp4" in names

    hdd = client.get("/api/videos/search", params={"keyword": "", "storage": "EXTERNAL_HDD"}).json()
    assert {it["essential_filename"] for it in hdd} == {"hoge.mp4"}


def test_unrated_random_and_fate(client, tmp_path):
    """実在ファイルの未判定動画がランダム/運命の1本で返る。"""
    f = tmp_path / "u.mp4"
    f.write_text("x")
    _insert("u.mp4", str(f), -1)

    rand = client.get("/api/videos/unrated/random", params={"n": 5}).json()
    assert [it["essential_filename"] for it in rand] == ["u.mp4"]

    fate = client.get("/api/videos/unrated/fate")
    assert fate.status_code == 200
    assert fate.json()["essential_filename"] == "u.mp4"


def test_unrated_fate_204_when_none(client):
    """未判定動画が無いとき 204。"""
    assert client.get("/api/videos/unrated/fate").status_code == 204


def test_selection_list_and_fate(client, tmp_path):
    """セレクション一覧/運命の1本が folder で絞られる。"""
    sel = tmp_path / "sel"
    sel.mkdir()
    f = sel / "!s.mp4"
    f.write_text("x")
    _insert("s.mp4", str(f), -1, needs_sel=1)
    _insert("other.mp4", "C:/zzz/!other.mp4", -1, needs_sel=1)  # 別フォルダ

    lst = client.get("/api/videos/selection",
                     params={"folder": str(sel), "status": "unselected"}).json()
    assert {it["essential_filename"] for it in lst["items"]} == {"s.mp4"}

    fate = client.get("/api/videos/selection/fate", params={"folder": str(sel)})
    assert fate.status_code == 200
    assert fate.json()["essential_filename"] == "s.mp4"


def test_selection_fate_204_when_none(client, tmp_path):
    """未選別が無いフォルダは 204。"""
    r = client.get("/api/videos/selection/fate", params={"folder": str(tmp_path / "empty")})
    assert r.status_code == 204


def test_filter_options(client):
    """使用中のレベル・登場人物・保存場所が返る。"""
    _insert("a.mp4", "C:/x/a.mp4", 3, performer="Alice", storage="C_DRIVE")
    _insert("b.mp4", "D:/y/b.mp4", -1, performer="Bob", storage="EXTERNAL_HDD")

    opts = client.get("/api/filter-options").json()
    assert set(opts["favorite_levels"]) == {3, -1}
    assert set(opts["performers"]) == {"Alice", "Bob"}
    assert set(opts["storage_locations"]) == {"C_DRIVE", "EXTERNAL_HDD"}


def test_videos_sort_view_count_desc(client):
    """sort=view_count&order=desc で視聴回数降順に並ぶ。"""
    a = _insert("a.mp4", "C:/x/a.mp4", 1)
    b = _insert("b.mp4", "C:/x/b.mp4", 1)
    with get_db_connection() as conn:
        for _ in range(3):
            conn.execute(
                "INSERT INTO viewing_history (video_id, viewed_at, viewing_method)"
                " VALUES (?, datetime('now'), 'APP_PLAYBACK')", (b,))
        conn.execute(
            "INSERT INTO viewing_history (video_id, viewed_at, viewing_method)"
            " VALUES (?, datetime('now'), 'APP_PLAYBACK')", (a,))

    items = client.get("/api/videos", params={"sort": "view_count", "order": "desc"}).json()["items"]
    assert [it["essential_filename"] for it in items[:2]] == ["b.mp4", "a.mp4"]


def test_videos_levels_csv_form(client):
    """levels はカンマ区切り（?levels=3,4）でも受け取れる。"""
    _insert("a.mp4", "C:/x/###_a.mp4", 3)
    _insert("b.mp4", "C:/x/####_b.mp4", 4)
    _insert("c.mp4", "C:/x/c.mp4", -1)

    body = client.get("/api/videos", params={"levels": "3,4"}).json()
    assert {it["essential_filename"] for it in body["items"]} == {"a.mp4", "b.mp4"}


def test_selection_folder_boundary_excludes_sibling(client, tmp_path):
    """folder=.../sel が兄弟の .../selection2 を誤って含めない（区切り境界一致）。"""
    sel = tmp_path / "sel"
    sel2 = tmp_path / "selection2"
    sel.mkdir()
    sel2.mkdir()
    (sel / "!a.mp4").write_text("x")
    (sel2 / "!b.mp4").write_text("x")
    _insert("a.mp4", str(sel / "!a.mp4"), -1, needs_sel=1)
    _insert("b.mp4", str(sel2 / "!b.mp4"), -1, needs_sel=1)

    lst = client.get("/api/videos/selection",
                     params={"folder": str(sel), "status": "unselected"}).json()
    assert {it["essential_filename"] for it in lst["items"]} == {"a.mp4"}
