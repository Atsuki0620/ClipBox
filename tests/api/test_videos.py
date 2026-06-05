"""
ClipBox API - GET /api/videos のテスト。

tmp_db に動画を投入し、フィルタ・ページング・派生フィールドの動作を TestClient で検証する。
INSERT パターンは tests/test_video_manager.py に倣う。
"""

from fastapi.testclient import TestClient

import core.database as database
from api_app import app


def _insert_video(essential, path, level, performer, *, available=1, deleted=0):
    with database.get_db_connection() as conn:
        conn.execute(
            """
            INSERT INTO videos (
                essential_filename, current_full_path, current_favorite_level,
                performer, storage_location, is_available, is_deleted
            ) VALUES (?, ?, ?, ?, 'C_DRIVE', ?, ?)
            """,
            (essential, path, level, performer, available, deleted),
        )


def _seed(tmp_path):
    # 判定済み（###_ プレフィックス）
    _insert_video("alpha.mp4", str(tmp_path / "###_alpha.mp4"), 3, "P1")
    # セレクション完了（+ プレフィックス）
    _insert_video("beta.mp4", str(tmp_path / "+beta.mp4"), 1, "P2")
    # 未判定（プレフィックスなし）
    _insert_video("gamma.mp4", str(tmp_path / "gamma.mp4"), -1, "P1")


def test_list_videos_returns_available(tmp_db, tmp_path):
    """利用可能・未削除の動画が全件返る（既定フィルタ）。"""
    _seed(tmp_path)
    client = TestClient(app)

    body = client.get("/api/videos").json()

    assert body["total"] == 3
    assert len(body["items"]) == 3
    # 既定ソート: level DESC → alpha(3), beta(1), gamma(-1)
    assert [it["essential_filename"] for it in body["items"]] == ["alpha.mp4", "beta.mp4", "gamma.mp4"]


def test_list_videos_levels_filter(tmp_db, tmp_path):
    """levels フィルタで該当レベルのみ返る。"""
    _seed(tmp_path)
    client = TestClient(app)

    body = client.get("/api/videos", params={"levels": [3]}).json()

    assert body["total"] == 1
    assert body["items"][0]["essential_filename"] == "alpha.mp4"


def test_list_videos_keyword_filters_by_essential_filename(tmp_db, tmp_path):
    """keyword で本質的ファイル名に部分一致する動画のみ返る（フィルタと合成可能）。"""
    _seed(tmp_path)
    client = TestClient(app)

    body = client.get("/api/videos", params={"keyword": "alph"}).json()

    assert body["total"] == 1
    assert body["items"][0]["essential_filename"] == "alpha.mp4"


def test_list_videos_keyword_combines_with_filters_and_paging(tmp_db, tmp_path):
    """keyword + levels + ページングが整合する（検索後にソート→ページング）。"""
    _insert_video("report1.mp4", str(tmp_path / "###_report1.mp4"), 3, "P1")
    _insert_video("report2.mp4", str(tmp_path / "###_report2.mp4"), 3, "P1")
    _insert_video("memo.mp4", str(tmp_path / "###_memo.mp4"), 3, "P1")
    client = TestClient(app)

    body = client.get("/api/videos", params={"keyword": "report", "levels": [3], "page_size": 1, "page": 1}).json()

    assert body["total"] == 2          # report* のみが検索対象
    assert len(body["items"]) == 1     # page_size=1 で1件
    assert body["items"][0]["essential_filename"].startswith("report")


def test_list_videos_keyword_normalizes_fullwidth_and_case(tmp_db, tmp_path):
    """keyword は NFKC・小文字化・カナ寄せで正規化一致する。"""
    _insert_video("ABCもも.mp4", str(tmp_path / "ABCもも.mp4"), 0, "P1")
    client = TestClient(app)

    # 全角・大文字で検索しても一致（normalize_text）
    body = client.get("/api/videos", params={"keyword": "ＡＢＣ"}).json()

    assert body["total"] == 1
    assert body["items"][0]["essential_filename"] == "ABCもも.mp4"


def test_list_videos_pagination(tmp_db, tmp_path):
    """page_size / page でページングされ、total は全件数を返す。"""
    _seed(tmp_path)
    client = TestClient(app)

    page1 = client.get("/api/videos", params={"page_size": 2, "page": 1}).json()
    page2 = client.get("/api/videos", params={"page_size": 2, "page": 2}).json()

    assert page1["total"] == 3 and page2["total"] == 3
    assert len(page1["items"]) == 2
    assert len(page2["items"]) == 1


def test_list_videos_derived_fields(tmp_db, tmp_path):
    """is_selection_completed（+ 接頭辞）と is_judged（接頭辞有無）が正しく派生する。"""
    _seed(tmp_path)
    client = TestClient(app)

    by_name = {it["essential_filename"]: it for it in client.get("/api/videos").json()["items"]}

    # + プレフィックスのみ is_selection_completed=True
    assert by_name["beta.mp4"]["is_selection_completed"] is True
    assert by_name["alpha.mp4"]["is_selection_completed"] is False

    # ファイル名が essential と異なる（プレフィックスあり）と is_judged=True
    assert by_name["alpha.mp4"]["is_judged"] is True   # ###_alpha.mp4 != alpha.mp4
    assert by_name["gamma.mp4"]["is_judged"] is False  # gamma.mp4 == gamma.mp4
