"""旧 viewing_history を検証済みバックアップ後に削除する保守スクリプト。"""

from __future__ import annotations

import argparse
import csv
import hashlib
import shutil
import socket
import sqlite3
import sys
from datetime import datetime
from pathlib import Path
from typing import Any, Iterable

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

import config
from core.database import get_db_connection
from core.viewing import LEGACY_VIEWING_METHODS, VIEWING_METHOD_APP_PLAYBACK

CONFIRMATION_PHRASE = "PURGE_LEGACY_VIEWING_HISTORY"
SERVICE_PORTS = {"Next.js": 3000, "FastAPI": 8000, "Streamlit": 8501}
CSV_COLUMNS = ("id", "video_id", "viewed_at", "viewing_method")


def _running_services() -> list[str]:
    running: list[str] = []
    for name, port in SERVICE_PORTS.items():
        try:
            with socket.create_connection(("127.0.0.1", port), timeout=0.25):
                running.append(f"{name}({port})")
        except OSError:
            continue
    return running


def _integrity_check(conn: sqlite3.Connection) -> list[str]:
    return [str(row[0]) for row in conn.execute("PRAGMA integrity_check").fetchall()]


def _method_counts(conn: sqlite3.Connection) -> dict[str | None, int]:
    rows = conn.execute(
        "SELECT viewing_method, COUNT(*) AS count"
        " FROM viewing_history GROUP BY viewing_method ORDER BY viewing_method"
    ).fetchall()
    return {row["viewing_method"]: int(row["count"]) for row in rows}


def _legacy_rows(conn: sqlite3.Connection) -> list[sqlite3.Row]:
    placeholders = ",".join("?" for _ in LEGACY_VIEWING_METHODS)
    return conn.execute(
        f"SELECT {', '.join(CSV_COLUMNS)} FROM viewing_history"
        f" WHERE viewing_method IN ({placeholders}) ORDER BY id",
        LEGACY_VIEWING_METHODS,
    ).fetchall()


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _copy_database_snapshot(source: Path, destination: Path) -> None:
    shutil.copy2(source, destination)


def _write_legacy_csv(path: Path, rows: Iterable[sqlite3.Row]) -> None:
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.writer(handle)
        writer.writerow(CSV_COLUMNS)
        writer.writerows(tuple(row[column] for column in CSV_COLUMNS) for row in rows)


def _cleanup_temp_files(paths: Iterable[Path]) -> list[str]:
    """一時ファイルを削除し、失敗内容を呼び出し元で報告できる形で返す。"""
    errors: list[str] = []
    for path in paths:
        try:
            if path.exists():
                path.unlink()
        except OSError as exc:
            errors.append(f"{path}: {exc}")
    return errors


def _verify_backup(
    backup_path: Path,
    expected_counts: dict[str | None, int],
    expected_sha256: str,
) -> str:
    actual_sha256 = _sha256(backup_path)
    if actual_sha256 != expected_sha256:
        raise RuntimeError("DBバックアップのSHA-256が元DBと一致しません")

    uri = f"{backup_path.resolve().as_uri()}?mode=ro"
    backup_conn = sqlite3.connect(uri, uri=True)
    try:
        integrity = [str(row[0]) for row in backup_conn.execute("PRAGMA integrity_check").fetchall()]
        if integrity != ["ok"]:
            raise RuntimeError(f"DBバックアップの整合性検証に失敗しました: {integrity}")
        rows = backup_conn.execute(
            "SELECT viewing_method, COUNT(*) FROM viewing_history"
            " GROUP BY viewing_method ORDER BY viewing_method"
        ).fetchall()
        actual_counts = {row[0]: int(row[1]) for row in rows}
    finally:
        backup_conn.close()
    if actual_counts != expected_counts:
        raise RuntimeError("DBバックアップのmethod別件数が元DBと一致しません")
    return actual_sha256


def _verify_csv(csv_path: Path, expected_count: int) -> str:
    with csv_path.open("r", encoding="utf-8", newline="") as handle:
        reader = csv.reader(handle)
        header = next(reader, None)
        row_count = sum(1 for _ in reader)
    if header != list(CSV_COLUMNS):
        raise RuntimeError("CSVの列が期待値と一致しません")
    if row_count != expected_count:
        raise RuntimeError("CSVの行数が削除対象件数と一致しません")
    return _sha256(csv_path)


def _base_result(
    *,
    status: str,
    counts: dict[str | None, int] | None = None,
    integrity: list[str] | None = None,
    running_services: list[str] | None = None,
) -> dict[str, Any]:
    return {
        "status": status,
        "method_counts": counts or {},
        "integrity_check": integrity or [],
        "running_services": running_services or [],
        "deleted_count": 0,
        "backup_path": "",
        "backup_sha256": "",
        "csv_path": "",
        "csv_sha256": "",
        "message": "",
    }


def purge_legacy_viewing_history(
    *,
    execute: bool = False,
    confirmation: str | None = None,
    now: datetime | None = None,
    check_services: bool = True,
) -> dict[str, Any]:
    """dry-run、または検証済みバックアップ後の対象限定削除を実行する。"""
    db_path = Path(config.DATABASE_PATH)
    backup_dir = Path(config.BACKUP_DIR)
    running = _running_services() if check_services else []

    if not db_path.exists():
        result = _base_result(status="error", running_services=running)
        result["message"] = f"DBが見つかりません: {db_path}"
        return result

    if execute and confirmation != CONFIRMATION_PHRASE:
        result = _base_result(status="error", running_services=running)
        result["message"] = "削除確認文字列が一致しません"
        return result

    if execute and running:
        result = _base_result(status="error", running_services=running)
        result["message"] = "Next.js、FastAPI、Streamlitを停止してから再実行してください"
        return result

    try:
        if not execute:
            with get_db_connection() as conn:
                counts = _method_counts(conn)
                integrity = _integrity_check(conn)
            result = _base_result(
                status="dry_run",
                counts=counts,
                integrity=integrity,
                running_services=running,
            )
            result["message"] = "dry-runのためDBとバックアップ領域は変更していません"
            return result

        with get_db_connection() as conn:
            # サービス停止確認後も別プロセスがDBを使用していれば、ここで失敗して何も削除しない。
            conn.execute("BEGIN EXCLUSIVE")
            counts = _method_counts(conn)
            integrity = _integrity_check(conn)
            if integrity != ["ok"]:
                raise RuntimeError(f"削除前DBの整合性検証に失敗しました: {integrity}")

            legacy_rows = _legacy_rows(conn)
            target_count = len(legacy_rows)
            if target_count == 0:
                result = _base_result(
                    status="noop",
                    counts=counts,
                    integrity=integrity,
                    running_services=running,
                )
                result["message"] = "削除対象は0件です。バックアップは作成していません"
                return result

            backup_dir.mkdir(parents=True, exist_ok=True)
            timestamp = (now or datetime.now()).strftime("%Y%m%d_%H%M%S")
            backup_path = backup_dir / f"videos_pre_legacy_purge_{timestamp}.db"
            csv_path = backup_dir / f"viewing_history_legacy_{timestamp}.csv"
            backup_temp = backup_path.with_suffix(".db.tmp")
            csv_temp = csv_path.with_suffix(".csv.tmp")
            if any(path.exists() for path in (backup_path, csv_path, backup_temp, csv_temp)):
                raise RuntimeError("同じタイムスタンプのバックアップファイルが既に存在します")

            artifact_error: Exception | None = None
            try:
                source_sha256 = _sha256(db_path)
                _copy_database_snapshot(db_path, backup_temp)
                backup_sha256 = _verify_backup(backup_temp, counts, source_sha256)

                _write_legacy_csv(csv_temp, legacy_rows)
                csv_sha256 = _verify_csv(csv_temp, target_count)
                backup_temp.replace(backup_path)
                csv_temp.replace(csv_path)
            except Exception as exc:
                artifact_error = exc

            cleanup_errors = _cleanup_temp_files((backup_temp, csv_temp))
            if artifact_error is not None:
                message = str(artifact_error)
                if cleanup_errors:
                    message += f" / 一時ファイルのcleanupにも失敗しました: {'; '.join(cleanup_errors)}"
                raise RuntimeError(message) from artifact_error
            if cleanup_errors:
                raise RuntimeError(
                    f"一時ファイルのcleanupに失敗しました: {'; '.join(cleanup_errors)}"
                )

            app_count_before = counts.get(VIEWING_METHOD_APP_PLAYBACK, 0)
            placeholders = ",".join("?" for _ in LEGACY_VIEWING_METHODS)
            cursor = conn.execute(
                f"DELETE FROM viewing_history WHERE viewing_method IN ({placeholders})",
                LEGACY_VIEWING_METHODS,
            )
            if cursor.rowcount != target_count:
                raise RuntimeError("削除件数が事前確認件数と一致しません")

            remaining_target = conn.execute(
                f"SELECT COUNT(*) FROM viewing_history"
                f" WHERE viewing_method IN ({placeholders})",
                LEGACY_VIEWING_METHODS,
            ).fetchone()[0]
            app_count_after = conn.execute(
                "SELECT COUNT(*) FROM viewing_history WHERE viewing_method = ?",
                (VIEWING_METHOD_APP_PLAYBACK,),
            ).fetchone()[0]
            final_integrity = _integrity_check(conn)
            if remaining_target != 0:
                raise RuntimeError("削除後も対象methodの行が残っています")
            if app_count_after != app_count_before:
                raise RuntimeError("APP_PLAYBACKの行数が変化しました")
            if final_integrity != ["ok"]:
                raise RuntimeError(f"削除後DBの整合性検証に失敗しました: {final_integrity}")

            result = _base_result(
                status="purged",
                counts=counts,
                integrity=final_integrity,
                running_services=running,
            )
            result.update(
                deleted_count=target_count,
                backup_path=str(backup_path),
                backup_sha256=backup_sha256,
                csv_path=str(csv_path),
                csv_sha256=csv_sha256,
                message=f"旧視聴履歴を{target_count}件削除しました",
            )
            return result
    except (OSError, sqlite3.Error, RuntimeError) as exc:
        result = _base_result(status="error", running_services=running)
        result["message"] = str(exc)
        return result


def _format_method_counts(counts: dict[str | None, int]) -> str:
    if not counts:
        return "none"
    return ", ".join(f"{key if key is not None else 'NULL'}={value}" for key, value in counts.items())


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--execute", action="store_true", help="検証済みバックアップ後に旧履歴を削除する")
    parser.add_argument("--confirm", help=f"削除確認文字列: {CONFIRMATION_PHRASE}")
    args = parser.parse_args()

    result = purge_legacy_viewing_history(execute=args.execute, confirmation=args.confirm)
    print(f"status={result['status']}")
    print(f"method_counts={_format_method_counts(result['method_counts'])}")
    print(f"integrity_check={result['integrity_check']}")
    if result["running_services"]:
        print(f"running_services={', '.join(result['running_services'])}")
    if result["backup_path"]:
        print(f"backup={result['backup_path']} sha256={result['backup_sha256']}")
        print(f"csv={result['csv_path']} sha256={result['csv_sha256']}")
    print(f"deleted_count={result['deleted_count']} message={result['message']}")
    return 1 if result["status"] == "error" else 0


if __name__ == "__main__":
    sys.exit(main())
