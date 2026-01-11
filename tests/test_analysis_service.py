from datetime import date, datetime, timedelta

import pandas as pd
import pytest

import config
from core import analysis_service
import core.database as db


def _setup_temp_db(tmp_path, monkeypatch):
    """テスト用の一時DBを初期化する。"""
    db_path = tmp_path / "analysis_test.db"
    monkeypatch.setattr(db, "DATABASE_PATH", db_path)
    monkeypatch.setattr(config, "DATABASE_PATH", db_path)
    db.init_database()
    with db.get_db_connection() as conn:
        conn.execute("DELETE FROM viewing_history")
        conn.execute("DELETE FROM videos")
    return db_path


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


def test_calculate_period_view_count_uses_period_range(tmp_path, monkeypatch):
    _setup_temp_db(tmp_path, monkeypatch)
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

