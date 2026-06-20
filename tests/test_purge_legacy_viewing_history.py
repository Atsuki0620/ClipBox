"""旧 viewing_history purge スクリプトの回帰テスト。"""

import csv
import sqlite3
from contextlib import contextmanager
from datetime import datetime

import config
from core import database
from scripts import purge_legacy_viewing_history as purge


def _seed_history() -> None:
    with database.get_db_connection() as conn:
        conn.execute(
            "INSERT INTO videos (id, essential_filename, current_full_path) VALUES (1, 'a.mp4', 'C:/a.mp4')"
        )
        conn.executemany(
            "INSERT INTO viewing_history (video_id, viewed_at, viewing_method) VALUES (1, ?, ?)",
            [
                ("2026-01-01 10:00:00", "APP_PLAYBACK"),
                ("2026-01-02 10:00:00", "FILE_ACCESS_DETECTED"),
                ("2026-01-03 10:00:00", "MANUAL_ENTRY"),
                ("2026-01-04 10:00:00", "UNKNOWN_METHOD"),
                ("2026-01-05 10:00:00", None),
            ],
        )


def _all_methods() -> list[str | None]:
    with database.get_db_connection() as conn:
        return [
            row[0]
            for row in conn.execute(
                "SELECT viewing_method FROM viewing_history ORDER BY id"
            ).fetchall()
        ]


def test_dry_run_does_not_modify_or_create_backup(tmp_db, tmp_path, monkeypatch):
    _seed_history()
    backup_dir = tmp_path / "backups"
    monkeypatch.setattr(config, "BACKUP_DIR", backup_dir)

    result = purge.purge_legacy_viewing_history(check_services=False)

    assert result["status"] == "dry_run"
    assert result["method_counts"]["APP_PLAYBACK"] == 1
    assert result["method_counts"]["FILE_ACCESS_DETECTED"] == 1
    assert result["method_counts"]["MANUAL_ENTRY"] == 1
    assert result["integrity_check"] == ["ok"]
    assert _all_methods() == [
        "APP_PLAYBACK",
        "FILE_ACCESS_DETECTED",
        "MANUAL_ENTRY",
        "UNKNOWN_METHOD",
        None,
    ]
    assert not backup_dir.exists()


def test_execute_backs_up_then_deletes_only_legacy_and_rerun_is_noop(
    tmp_db, tmp_path, monkeypatch
):
    _seed_history()
    backup_dir = tmp_path / "backups"
    monkeypatch.setattr(config, "BACKUP_DIR", backup_dir)
    now = datetime(2026, 6, 21, 12, 34, 56)

    result = purge.purge_legacy_viewing_history(
        execute=True,
        confirmation=purge.CONFIRMATION_PHRASE,
        now=now,
        check_services=False,
    )

    assert result["status"] == "purged"
    assert result["deleted_count"] == 2
    assert len(result["backup_sha256"]) == 64
    assert len(result["csv_sha256"]) == 64
    assert _all_methods() == ["APP_PLAYBACK", "UNKNOWN_METHOD", None]

    backup_path = backup_dir / "videos_pre_legacy_purge_20260621_123456.db"
    csv_path = backup_dir / "viewing_history_legacy_20260621_123456.csv"
    assert backup_path.exists()
    assert csv_path.exists()
    with sqlite3.connect(backup_path) as conn:
        assert conn.execute("SELECT COUNT(*) FROM viewing_history").fetchone()[0] == 5
        assert conn.execute(
            "SELECT COUNT(*) FROM viewing_history WHERE viewing_method = 'APP_PLAYBACK'"
        ).fetchone()[0] == 1
    with csv_path.open(encoding="utf-8", newline="") as handle:
        rows = list(csv.reader(handle))
    assert rows[0] == list(purge.CSV_COLUMNS)
    assert [row[3] for row in rows[1:]] == ["FILE_ACCESS_DETECTED", "MANUAL_ENTRY"]

    rerun = purge.purge_legacy_viewing_history(
        execute=True,
        confirmation=purge.CONFIRMATION_PHRASE,
        now=now,
        check_services=False,
    )
    assert rerun["status"] == "noop"
    assert rerun["backup_path"] == ""
    assert len(list(backup_dir.iterdir())) == 2


def test_backup_failure_aborts_without_deleting(tmp_db, tmp_path, monkeypatch):
    _seed_history()
    monkeypatch.setattr(config, "BACKUP_DIR", tmp_path / "backups")

    def fail_copy(source, destination):
        raise OSError("copy failed")

    monkeypatch.setattr(purge, "_copy_database_snapshot", fail_copy)
    result = purge.purge_legacy_viewing_history(
        execute=True,
        confirmation=purge.CONFIRMATION_PHRASE,
        check_services=False,
    )

    assert result["status"] == "error"
    assert "copy failed" in result["message"]
    assert _all_methods() == [
        "APP_PLAYBACK",
        "FILE_ACCESS_DETECTED",
        "MANUAL_ENTRY",
        "UNKNOWN_METHOD",
        None,
    ]


def test_lock_failure_aborts_before_backup(tmp_db, tmp_path, monkeypatch):
    _seed_history()
    backup_dir = tmp_path / "backups"
    monkeypatch.setattr(config, "BACKUP_DIR", backup_dir)

    @contextmanager
    def locked_connection():
        raise sqlite3.OperationalError("database is locked")
        yield

    monkeypatch.setattr(purge, "get_db_connection", locked_connection)
    result = purge.purge_legacy_viewing_history(
        execute=True,
        confirmation=purge.CONFIRMATION_PHRASE,
        check_services=False,
    )

    assert result["status"] == "error"
    assert "database is locked" in result["message"]
    assert not backup_dir.exists()
