from datetime import date, datetime, timedelta

import pandas as pd
import pytest

import config
from core import analysis_service
import core.database as db


def test_convert_period_filter_preset_span():
    start, end = analysis_service.convert_period_filter("直近7日")
    assert start is not None and end is not None
    assert end - start == timedelta(days=7)


def test_convert_period_filter_custom_invalid_raises():
    with pytest.raises(ValueError):
        analysis_service.convert_period_filter("カスタム", (date(2024, 2, 2), date(2024, 2, 1)))


def test_apply_scope_filter_filters_available_only():
    df = pd.DataFrame({"id": [1, 2], "is_available": [1, 0]})
    filtered = analysis_service.apply_scope_filter(df, "利用可能のみ")
    assert set(filtered["id"]) == {1}


def test_calculate_period_view_count_uses_period_range(tmp_db):
    now = datetime.now()
    with db.get_db_connection() as conn:
        conn.execute(
            """
            INSERT INTO videos (id, essential_filename, current_full_path, current_favorite_level,
                                file_size, performer, storage_location, last_file_modified,
                                created_at, last_scanned_at, notes, file_created_at, is_available, is_deleted)
            VALUES (1, 'v1.mp4', 'v1.mp4', 1, 1024, NULL, 'C_DRIVE', NULL,
                    CURRENT_TIMESTAMP, NULL, NULL, NULL, 1, 0)
            """
        )
        conn.execute(
            """
            INSERT INTO videos (id, essential_filename, current_full_path, current_favorite_level,
                                file_size, performer, storage_location, last_file_modified,
                                created_at, last_scanned_at, notes, file_created_at, is_available, is_deleted)
            VALUES (2, 'v2.mp4', 'v2.mp4', 2, 2048, NULL, 'EXTERNAL_HDD', NULL,
                    CURRENT_TIMESTAMP, NULL, NULL, NULL, 1, 0)
            """
        )

        conn.execute(
            "INSERT INTO viewing_history (video_id, viewed_at, viewing_method) VALUES (?, ?, 'APP_PLAYBACK')",
            (1, now - timedelta(days=3)),
        )
        conn.execute(
            "INSERT INTO viewing_history (video_id, viewed_at, viewing_method) VALUES (?, ?, 'APP_PLAYBACK')",
            (1, now - timedelta(days=40)),
        )
        conn.execute(
            "INSERT INTO viewing_history (video_id, viewed_at, viewing_method) VALUES (?, ?, 'APP_PLAYBACK')",
            (2, now - timedelta(days=2)),
        )

    df = analysis_service.load_analysis_data(is_deleted_filter=0)
    period_start, period_end = analysis_service.convert_period_filter("直近30日")
    df_period = analysis_service.calculate_period_view_count(df, period_start, period_end)

    counts = dict(zip(df_period["id"], df_period["period_view_count"]))
    assert counts[1] == 1  # 40日前の履歴は除外される
    assert counts[2] == 1


def test_get_kpi_stats_excludes_selection_and_unavailable(tmp_db):
    """get_kpi_stats が未判定/判定済みを正しく数え、セレクション・利用不可・削除を除外する。"""
    now = datetime.now()
    with db.get_db_connection() as conn:
        def ins(vid, level, *, available=1, deleted=0, needs_sel=0, sel_done=0):
            conn.execute(
                """
                INSERT INTO videos (id, essential_filename, current_full_path,
                                    current_favorite_level, storage_location,
                                    is_available, is_deleted, needs_selection, is_selection_completed)
                VALUES (?, ?, ?, ?, 'C_DRIVE', ?, ?, ?, ?)
                """,
                (vid, f"v{vid}.mp4", f"v{vid}.mp4", level, available, deleted, needs_sel, sel_done),
            )

        ins(1, -1)                 # 未判定
        ins(2, 0)                  # 判定済み
        ins(3, 3)                  # 判定済み
        ins(4, -1, needs_sel=1)    # 除外（セレクション未選別）
        ins(5, 2, sel_done=1)      # 除外（セレクション完了）
        ins(6, -1, deleted=1)      # 除外（論理削除）
        ins(7, 1, available=0)     # 除外（利用不可）

        # 本日の通常判定（カウントされる）とセレクション判定（除外される）
        conn.execute(
            "INSERT INTO judgment_history (video_id, old_level, new_level, judged_at, was_selection_judgment)"
            " VALUES (2, -1, 0, ?, 0)",
            (now,),
        )
        conn.execute(
            "INSERT INTO judgment_history (video_id, old_level, new_level, judged_at, was_selection_judgment)"
            " VALUES (4, -1, 1, ?, 1)",
            (now,),
        )

    with db.get_db_connection() as conn:
        stats = analysis_service.get_kpi_stats(conn)

    assert stats["unrated_count"] == 1
    assert stats["judged_count"] == 2
    assert stats["judged_rate"] == pytest.approx(2 / 3 * 100)
    assert stats["today_judged_count"] == 1  # セレクション判定(was_selection_judgment=1)は数えない


def test_get_like_count_ranking_period_filters_by_liked_at(tmp_db):
    """get_like_count_ranking が period で liked_at を絞り、未指定なら全期間累計になる。"""
    now = datetime.now()
    with db.get_db_connection() as conn:
        conn.execute(
            """
            INSERT INTO videos (id, essential_filename, current_full_path, current_favorite_level,
                                storage_location, is_available, is_deleted)
            VALUES (1, 'v1.mp4', 'v1.mp4', 3, 'C_DRIVE', 1, 0)
            """
        )
        conn.execute("INSERT INTO likes (video_id, liked_at) VALUES (1, ?)", (now - timedelta(days=2),))
        conn.execute("INSERT INTO likes (video_id, liked_at) VALUES (1, ?)", (now - timedelta(days=40),))

    df = analysis_service.load_analysis_data(is_deleted_filter=0)

    ranking_all = analysis_service.get_like_count_ranking(df, top_n=50)
    assert int(ranking_all["いいね数"].iloc[0]) == 2  # 全期間: 2件

    ranking_period = analysis_service.get_like_count_ranking(
        df, period_start=now - timedelta(days=30), period_end=now, top_n=50
    )
    assert int(ranking_period["いいね数"].iloc[0]) == 1  # 直近30日: 1件のみ

