"""
共通テストフィクスチャ

パッチ漏れによる本番DB破壊を防ぐため、
DB パスの差し替えをここで一元管理する。
"""

import pytest
import config
import core.database as database


@pytest.fixture
def tmp_db(tmp_path, monkeypatch):
    """
    テスト用一時 DB を初期化して返す。

    config.DATABASE_PATH と core.database.DATABASE_PATH の両方を
    一時パスに差し替えることで、パッチ漏れによる本番 DB 破壊を防ぐ。

    Usage:
        def test_something(tmp_db):
            with database.get_db_connection() as conn:
                ...
    """
    db_path = tmp_path / "test.db"
    monkeypatch.setattr(config, "DATABASE_PATH", db_path)
    monkeypatch.setattr(database, "DATABASE_PATH", db_path)
    database.init_database()
    return db_path
