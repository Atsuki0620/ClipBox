"""
ClipBox - バックアップ機能のテスト
"""

from datetime import datetime

import config
import core.database as database
from scripts import startup_backup


def test_create_backup_creates_file_in_backup_dir(tmp_path, tmp_db, monkeypatch):
    """バックアップファイルが生成されてサイズが0より大きい"""
    backup_dir = tmp_path / "backups"
    monkeypatch.setattr(config, "BACKUP_DIR", backup_dir)

    result = database.create_backup()

    assert result["status"] == "success"
    assert result["size_bytes"] > 0
    assert result["filename"] != ""

    backup_files = list(backup_dir.glob("*.db"))
    assert len(backup_files) == 1
    assert backup_files[0].stat().st_size > 0


def test_create_backup_filename_contains_timestamp(tmp_path, tmp_db, monkeypatch):
    """バックアップファイル名にタイムスタンプが含まれる"""
    backup_dir = tmp_path / "backups"
    monkeypatch.setattr(config, "BACKUP_DIR", backup_dir)

    result = database.create_backup()

    assert result["status"] == "success"
    assert result["filename"].startswith("videos_")
    assert result["filename"].endswith(".db")


def test_create_startup_backup_skips_when_database_is_missing(tmp_path, monkeypatch):
    backup_dir = tmp_path / "backups"
    monkeypatch.setattr(config, "DATABASE_PATH", tmp_path / "missing.db")
    monkeypatch.setattr(config, "BACKUP_DIR", backup_dir)

    result = startup_backup.create_startup_backup(now=datetime(2026, 6, 6, 8, 0, 0))

    assert result["status"] == "skipped_missing_db"
    assert not list(backup_dir.glob("*.db"))


def test_create_startup_backup_creates_only_one_file_per_day(tmp_path, tmp_db, monkeypatch):
    backup_dir = tmp_path / "backups"
    monkeypatch.setattr(config, "BACKUP_DIR", backup_dir)

    first = startup_backup.create_startup_backup(now=datetime(2026, 6, 6, 8, 0, 0))
    second = startup_backup.create_startup_backup(now=datetime(2026, 6, 6, 12, 0, 0))

    backup_files = list(backup_dir.glob("videos_startup_20260606_*.db"))
    assert first["status"] == "success"
    assert second["status"] == "skipped_exists_today"
    assert len(backup_files) == 1


def test_create_startup_backup_prunes_only_old_startup_backups(
    tmp_path,
    tmp_db,
    monkeypatch,
):
    backup_dir = tmp_path / "backups"
    backup_dir.mkdir()
    monkeypatch.setattr(config, "BACKUP_DIR", backup_dir)

    for day in range(1, 13):
        (backup_dir / f"videos_startup_202606{day:02d}_000000.db").write_text(
            "old backup",
            encoding="utf-8",
        )
    manual_backup = backup_dir / "videos_20260601_000000.db"
    manual_backup.write_text("manual backup", encoding="utf-8")

    result = startup_backup.create_startup_backup(now=datetime(2026, 6, 20, 8, 0, 0))

    startup_files = sorted(path.name for path in backup_dir.glob("videos_startup_*.db"))
    assert result["status"] == "success"
    assert len(startup_files) == 10
    assert startup_files == [
        "videos_startup_20260604_000000.db",
        "videos_startup_20260605_000000.db",
        "videos_startup_20260606_000000.db",
        "videos_startup_20260607_000000.db",
        "videos_startup_20260608_000000.db",
        "videos_startup_20260609_000000.db",
        "videos_startup_20260610_000000.db",
        "videos_startup_20260611_000000.db",
        "videos_startup_20260612_000000.db",
        "videos_startup_20260620_080000.db",
    ]
    assert manual_backup.exists()
