"""
ClipBox API の read 系エンドポイントのテスト。
"""

from core.database import get_db_connection


def _insert(
    essential,
    path,
    level,
    *,
    performer="P",
    storage="C_DRIVE",
    available=1,
    deleted=0,
    needs_sel=0,
    sel_done=0,
):
    with get_db_connection() as conn:
        conn.execute(
            """
            INSERT INTO videos (
                essential_filename, current_full_path, current_favorite_level,
                performer, storage_location, is_available, is_deleted,
                needs_selection, is_selection_completed
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (essential, path, level, performer, storage, available, deleted, needs_sel, sel_done),
        )
        return conn.execute(
            "SELECT id FROM videos WHERE essential_filename = ?",
            (essential,),
        ).fetchone()[0]


def test_get_video_by_id_returns_including_deleted(client):
    """削除済み動画でも ID 指定取得はできる。"""
    vid = _insert("a.mp4", "C:/x/###_a.mp4", 3, deleted=1)
    body = client.get(f"/api/videos/{vid}").json()
    assert body["id"] == vid
    assert body["is_deleted"] is True


def test_get_video_by_id_404(client):
    """存在しない ID は 404。"""
    assert client.get("/api/videos/999999").status_code == 404


def test_search_normalizes_and_filters_storage(client):
    """検索は正規化を行い、storage でも絞れる。"""
    _insert("Test.mp4", "C:/x/Test.mp4", 1, storage="C_DRIVE")
    _insert("hoge.mp4", "D:/y/hoge.mp4", 1, storage="EXTERNAL_HDD")

    names = [
        it["essential_filename"]
        for it in client.get("/api/videos/search", params={"keyword": "Test"}).json()
    ]
    assert "Test.mp4" in names

    hdd = client.get("/api/videos/search", params={"keyword": "", "storage": "EXTERNAL_HDD"}).json()
    assert {it["essential_filename"] for it in hdd} == {"hoge.mp4"}


def test_unrated_random_and_fate(client, tmp_path):
    """未判定動画はランダム/選別の1本で返る。"""
    f = tmp_path / "u.mp4"
    f.write_text("x")
    _insert("u.mp4", str(f), -1)

    rand = client.get("/api/videos/unrated/random", params={"n": 5}).json()
    assert [it["essential_filename"] for it in rand] == ["u.mp4"]

    fate = client.get("/api/videos/unrated/fate")
    assert fate.status_code == 200
    assert fate.json()["essential_filename"] == "u.mp4"


def test_unrated_fate_204_when_none(client):
    """未判定動画がなければ 204。"""
    assert client.get("/api/videos/unrated/fate").status_code == 204


def test_selection_list_and_fate(client, tmp_path):
    """selection 一覧と fate は folder 配下で動く。"""
    sel = tmp_path / "sel"
    sel.mkdir()
    f = sel / "!s.mp4"
    f.write_text("x")
    _insert("s.mp4", str(f), -1, needs_sel=1)
    _insert("other.mp4", "C:/zzz/!other.mp4", -1, needs_sel=1)

    lst = client.get(
        "/api/videos/selection",
        params={"folder": str(sel), "status": "unselected"},
    ).json()
    assert {it["essential_filename"] for it in lst["items"]} == {"s.mp4"}

    fate = client.get("/api/videos/selection/fate", params={"folder": str(sel)})
    assert fate.status_code == 200
    assert fate.json()["essential_filename"] == "s.mp4"


def test_selection_list_show_unavailable_controls_visibility(client, tmp_path):
    """show_unavailable で selection-folder 内の利用不可動画の表示有無を切り替える。"""
    sel = tmp_path / "sel"
    sel.mkdir()
    available = sel / "!available.mp4"
    unavailable = sel / "!unavailable.mp4"
    available.write_text("x")
    unavailable.write_text("x")

    _insert("available.mp4", str(available), -1, needs_sel=1, available=1)
    _insert("unavailable.mp4", str(unavailable), -1, needs_sel=1, available=0)

    body_false = client.get(
        "/api/videos/selection",
        params={"folder": str(sel), "status": "all", "show_unavailable": False},
    ).json()
    assert {it["essential_filename"] for it in body_false["items"]} == {"available.mp4"}

    body_true = client.get(
        "/api/videos/selection",
        params={"folder": str(sel), "status": "all", "show_unavailable": True},
    ).json()
    assert {it["essential_filename"] for it in body_true["items"]} == {
        "available.mp4",
        "unavailable.mp4",
    }


def test_selection_list_available_after_library_scan(client, tmp_path):
    sel = tmp_path / "sel"
    library = tmp_path / "library"
    sel.mkdir()
    selection_file = sel / "!available_after_scan.mp4"
    selection_file.write_text("x")
    (library / "library.mp4").write_text("x")

    client.put(
        "/api/config",
        json={
            "library_roots": [str(library)],
            "selection_folder": str(sel),
        },
    )
    _insert(
        "available_after_scan.mp4",
        str(selection_file),
        -1,
        available=0,
        needs_sel=1,
    )

    assert client.post("/api/scan/library").status_code == 200

    body = client.get(
        "/api/videos/selection",
        params={"folder": str(sel), "status": "unselected", "show_unavailable": False},
    ).json()
    assert {it["essential_filename"] for it in body["items"]} == {
        "available_after_scan.mp4"
    }


def test_selection_list_supports_common_filters_and_sorting(client, tmp_path):
    """selection 一覧でも keyword / level / storage / sort が効く。"""
    sel = tmp_path / "sel"
    sel.mkdir()
    alpha = sel / "!alpha.mp4"
    beta = sel / "!beta.mp4"
    gamma = sel / "!gamma.mp4"
    alpha.write_text("x")
    beta.write_text("x")
    gamma.write_text("x")
    _insert("alpha.mp4", str(alpha), 3, storage="C_DRIVE", needs_sel=1)
    _insert("beta.mp4", str(beta), 4, storage="EXTERNAL_HDD", needs_sel=1)
    _insert("gamma.mp4", str(gamma), 4, storage="C_DRIVE", sel_done=1)

    body = client.get(
        "/api/videos/selection",
        params={
            "folder": str(sel),
            "status": "all",
            "levels": "3,4",
            "storage": "C_DRIVE",
            "keyword": "a",
            "sort": "title",
            "order": "asc",
        },
    ).json()
    assert [it["essential_filename"] for it in body["items"]] == ["alpha.mp4", "gamma.mp4"]


def test_selection_status_filters_respect_all_states(client, tmp_path):
    """status=all/unselected/completed の意味を維持する。"""
    sel = tmp_path / "sel"
    sel.mkdir()
    (sel / "!unselected.mp4").write_text("x")
    (sel / "!completed.mp4").write_text("x")
    (sel / "regular.mp4").write_text("x")
    _insert("unselected.mp4", str(sel / "!unselected.mp4"), -1, needs_sel=1)
    _insert("completed.mp4", str(sel / "!completed.mp4"), -1, sel_done=1)
    _insert("regular.mp4", str(sel / "regular.mp4"), -1)

    all_items = client.get(
        "/api/videos/selection",
        params={"folder": str(sel), "status": "all"},
    ).json()["items"]
    assert {it["essential_filename"] for it in all_items} == {
        "unselected.mp4",
        "completed.mp4",
        "regular.mp4",
    }

    unselected_items = client.get(
        "/api/videos/selection",
        params={"folder": str(sel), "status": "unselected"},
    ).json()["items"]
    assert {it["essential_filename"] for it in unselected_items} == {"unselected.mp4"}

    completed_items = client.get(
        "/api/videos/selection",
        params={"folder": str(sel), "status": "completed"},
    ).json()["items"]
    assert {it["essential_filename"] for it in completed_items} == {
        "completed.mp4",
        "regular.mp4",
    }


def test_selection_fate_204_when_none(client, tmp_path):
    """未選別がなければ 204。"""
    r = client.get("/api/videos/selection/fate", params={"folder": str(tmp_path / "empty")})
    assert r.status_code == 204


def test_filter_options(client):
    """利用中のレベル・出演者・保存先が返る。"""
    _insert("a.mp4", "C:/x/a.mp4", 3, performer="Alice", storage="C_DRIVE")
    _insert("b.mp4", "D:/y/b.mp4", -1, performer="Bob", storage="EXTERNAL_HDD")

    opts = client.get("/api/filter-options").json()
    assert set(opts["favorite_levels"]) == {3, -1}
    assert set(opts["performers"]) == {"Alice", "Bob"}
    assert set(opts["storage_locations"]) == {"C_DRIVE", "EXTERNAL_HDD"}


def test_videos_sort_view_count_desc(client):
    """sort=view_count&order=desc で視聴回数順に並ぶ。"""
    a = _insert("a.mp4", "C:/x/a.mp4", 1)
    b = _insert("b.mp4", "C:/x/b.mp4", 1)
    with get_db_connection() as conn:
        for _ in range(3):
            conn.execute(
                "INSERT INTO viewing_history (video_id, viewed_at, viewing_method)"
                " VALUES (?, datetime('now'), 'APP_PLAYBACK')",
                (b,),
            )
        conn.execute(
            "INSERT INTO viewing_history (video_id, viewed_at, viewing_method)"
            " VALUES (?, datetime('now'), 'APP_PLAYBACK')",
            (a,),
        )

    items = client.get("/api/videos", params={"sort": "view_count", "order": "desc"}).json()["items"]
    assert [it["essential_filename"] for it in items[:2]] == ["b.mp4", "a.mp4"]


def test_videos_levels_csv_form(client):
    """levels はカンマ区切りで受け取れる。"""
    _insert("a.mp4", "C:/x/###_a.mp4", 3)
    _insert("b.mp4", "C:/x/####_b.mp4", 4)
    _insert("c.mp4", "C:/x/c.mp4", -1)

    body = client.get("/api/videos", params={"levels": "3,4"}).json()
    assert {it["essential_filename"] for it in body["items"]} == {"a.mp4", "b.mp4"}


def test_selection_folder_boundary_excludes_sibling(client, tmp_path):
    """folder=.../sel が兄弟の .../selection2 を誤って含めない。"""
    sel = tmp_path / "sel"
    sel2 = tmp_path / "selection2"
    sel.mkdir()
    sel2.mkdir()
    (sel / "!a.mp4").write_text("x")
    (sel2 / "!b.mp4").write_text("x")
    _insert("a.mp4", str(sel / "!a.mp4"), -1, needs_sel=1)
    _insert("b.mp4", str(sel2 / "!b.mp4"), -1, needs_sel=1)

    lst = client.get(
        "/api/videos/selection",
        params={"folder": str(sel), "status": "unselected"},
    ).json()
    assert {it["essential_filename"] for it in lst["items"]} == {"a.mp4"}
