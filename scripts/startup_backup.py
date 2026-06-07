"""Create one consistent SQLite backup per launcher startup day."""

from __future__ import annotations

import re
import sqlite3
import sys
from datetime import datetime
from pathlib import Path
from typing import Any

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

import config

STARTUP_BACKUP_KEEP_COUNT = 10
STARTUP_BACKUP_PATTERN = re.compile(r"^videos_startup_(\d{8})_(\d{6})\.db$")


def create_startup_backup(now: datetime | None = None) -> dict[str, Any]:
    """Create today's startup backup unless one already exists."""
    current_time = now or datetime.now()
    db_path = Path(config.DATABASE_PATH)
    backup_dir = Path(config.BACKUP_DIR)
    date_part = current_time.strftime("%Y%m%d")

    try:
        if not db_path.exists():
            return {
                "status": "skipped_missing_db",
                "message": f"database not found: {db_path}",
                "filename": "",
                "size_bytes": 0,
                "deleted_count": 0,
            }

        backup_dir.mkdir(parents=True, exist_ok=True)

        if _has_startup_backup_for_date(backup_dir, date_part):
            deleted = prune_startup_backups(backup_dir)
            return {
                "status": "skipped_exists_today",
                "message": f"startup backup already exists for {date_part}",
                "filename": "",
                "size_bytes": 0,
                "deleted_count": len(deleted),
            }

        timestamp = current_time.strftime("%Y%m%d_%H%M%S")
        backup_path = backup_dir / f"videos_startup_{timestamp}.db"

        _backup_sqlite_database(db_path, backup_path)
        deleted = prune_startup_backups(backup_dir)

        return {
            "status": "success",
            "message": f"startup backup created: {backup_path.name}",
            "filename": backup_path.name,
            "size_bytes": backup_path.stat().st_size,
            "deleted_count": len(deleted),
        }
    except Exception as exc:
        return {
            "status": "error",
            "message": str(exc),
            "filename": "",
            "size_bytes": 0,
            "deleted_count": 0,
        }


def prune_startup_backups(
    backup_dir: Path,
    keep_count: int = STARTUP_BACKUP_KEEP_COUNT,
) -> list[str]:
    """Delete startup backups older than the newest ``keep_count`` files."""
    candidates: list[tuple[str, Path]] = []

    if not backup_dir.exists():
        return []

    for path in backup_dir.iterdir():
        if not path.is_file():
            continue
        match = STARTUP_BACKUP_PATTERN.fullmatch(path.name)
        if match is None:
            continue
        timestamp = f"{match.group(1)}_{match.group(2)}"
        candidates.append((timestamp, path))

    candidates.sort(key=lambda item: item[0], reverse=True)

    deleted: list[str] = []
    for _, path in candidates[keep_count:]:
        path.unlink()
        deleted.append(path.name)
    return deleted


def _has_startup_backup_for_date(backup_dir: Path, date_part: str) -> bool:
    for path in backup_dir.iterdir():
        if not path.is_file():
            continue
        match = STARTUP_BACKUP_PATTERN.fullmatch(path.name)
        if match is not None and match.group(1) == date_part:
            return True
    return False


def _backup_sqlite_database(db_path: Path, backup_path: Path) -> None:
    temp_path = backup_path.with_name(f"{backup_path.name}.tmp")
    if temp_path.exists():
        temp_path.unlink()

    source: sqlite3.Connection | None = None
    target: sqlite3.Connection | None = None
    try:
        source_uri = f"{db_path.resolve().as_uri()}?mode=ro"
        source = sqlite3.connect(source_uri, uri=True)
        target = sqlite3.connect(temp_path)
        source.backup(target)
        target.commit()
        target.close()
        target = None
        source.close()
        source = None
        temp_path.replace(backup_path)
    finally:
        if target is not None:
            target.close()
        if source is not None:
            source.close()
        if temp_path.exists():
            temp_path.unlink()


def main() -> int:
    result = create_startup_backup()
    print(
        "status={status} filename={filename} size_bytes={size_bytes} "
        "deleted_count={deleted_count} message={message}".format(**result)
    )
    return 1 if result["status"] == "error" else 0


if __name__ == "__main__":
    sys.exit(main())
