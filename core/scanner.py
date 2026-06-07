"""
ClipBox - ファイルスキャン機能
動画ファイルのスキャンと識別を行う
"""

import os
import re
import time
from pathlib import Path
from typing import List, Optional, Sequence, Tuple, Union
from datetime import datetime

from config import VIDEO_EXTENSIONS
from core.logger import get_logger

logger = get_logger(__name__)

PathLike = Union[str, Path]


def extract_essential_filename(filename: str) -> Tuple[int, str, bool, bool]:
    """
    ファイル名からお気に入りレベル、本質的ファイル名、セレクションフラグを抽出。

    【設計意図】この関数は DB 同一性判定の基盤。プレフィックスが変わっても
    （レベル変更・ファイル移動）同じ動画と認識するための核心ロジック。
    変更時は必ず tests/test_scanner.py を実行すること。
    （設計根拠: docs/decisions/001-essential-filename.md）

    パース例:
    - "!###_作品.mp4" -> (3, "作品.mp4", True, False)
    - "!_作品.mp4"    -> (0, "作品.mp4", True, False)
    - "!作品.mp4"     -> (-1, "作品.mp4", True, False)
    - "+###_作品.mp4" -> (3, "作品.mp4", False, True)
    - "+_作品.mp4"    -> (0, "作品.mp4", False, True)
    - "+作品.mp4"     -> (-1, "作品.mp4", False, True)
    - "####_作品.mp4"  -> (4, "作品.mp4", False, False)
    - "###_作品.mp4"  -> (3, "作品.mp4", False, False)
    - "##_作品.mp4"   -> (2, "作品.mp4", False, False)
    - "#_作品.mp4"    -> (1, "作品.mp4", False, False)
    - "_作品.mp4"     -> (0, "作品.mp4", False, False)
    - "作品.mp4"      -> (-1, "作品.mp4", False, False)
    """
    needs_selection = False
    is_selection_completed = False

    if filename.startswith('!'):
        needs_selection = True
        filename = filename[1:]  # '!'を除去
    elif filename.startswith('+'):
        is_selection_completed = True
        filename = filename[1:]  # '+'を除去

    # プレフィックスパターンマッチ
    match = re.match(r'^(#{0,})_(.+)$', filename)
    if match:
        prefix = match.group(1)
        essential = match.group(2)
        level = len(prefix)
        return level, essential, needs_selection, is_selection_completed

    # プレフィックスなし（未判定）
    return -1, filename, needs_selection, is_selection_completed

def is_video_file(file_path: Path) -> bool:
    """
    ファイルが動画ファイルかどうかを判定

    Args:
        file_path: ファイルパス

    Returns:
        bool: 動画ファイルならTrue
    """
    return file_path.suffix.lower() in VIDEO_EXTENSIONS


def determine_storage_location(file_path: Path) -> str:
    """
    ファイルの保存場所を判定

    Args:
        file_path: ファイルパス

    Returns:
        str: 'C_DRIVE' または 'EXTERNAL_HDD'
    """
    # Windowsの場合、C:ドライブかどうかを判定
    drive = file_path.drive
    if drive and drive.upper() == 'C:':
        return 'C_DRIVE'
    else:
        return 'EXTERNAL_HDD'


def extract_performer(file_path: Path) -> Optional[str]:
    """
    登場人物を抽出（フォルダ名またはファイル名から）

    Args:
        file_path: ファイルパス

    Returns:
        str: 登場人物名（暫定実装: 親ディレクトリ名を使用）
    """
    # 親ディレクトリ名を登場人物として扱う（暫定実装）
    # より高度な抽出ロジックは将来実装
    return file_path.parent.name


class FileScanner:
    """ファイルスキャンとデータベース更新"""

    def __init__(
        self,
        scan_directories: Sequence[PathLike],
        protected_roots: Optional[Sequence[PathLike]] = None,
    ):
        """
        Args:
            scan_directories: スキャン対象ディレクトリのリスト
        """
        self.scan_directories = [Path(p) for p in scan_directories]
        self.protected_roots = [
            Path(p).resolve()
            for p in (protected_roots or [])
            if Path(p).exists() and Path(p).is_dir()
        ]
        self.found_files = set()  # スキャン中に見つかったファイルのessential_filenameを記録

    @staticmethod
    def _is_path_within_root(file_path: str, root: Path) -> bool:
        if not file_path:
            return False

        normalized_path = os.path.normcase(os.path.normpath(str(Path(file_path).resolve())))
        normalized_root = os.path.normcase(os.path.normpath(str(root)))
        return normalized_path == normalized_root or normalized_path.startswith(normalized_root + os.sep)

    def _is_protected_path(self, file_path: str) -> bool:
        if not self.protected_roots:
            return False

        for root in self.protected_roots:
            if self._is_path_within_root(file_path, root):
                return True
        return False

    def scan_and_update(self, db_conn):
        """
        ファイルをスキャンしてデータベースを更新。

        【重要】スキャンで見つからなかった全動画を is_available=0 に更新する。
        スキャン済みディレクトリが1つもない場合のみ更新をスキップ（安全ガード）。
        セレクションフォルダの個別スキャンには scan_single_directory() を使うこと。

        Args:
            db_conn: データベース接続（get_db_connection() のコンテキスト内で渡すこと）
        """
        start_time = time.monotonic()
        # スキャン前に見つかったファイルをリセット
        self.found_files = set()
        scanned_dirs: List[Path] = []

        # 各ディレクトリをスキャン（実際にスキャンしたディレクトリを記録）
        for directory in self.scan_directories:
            if directory.exists():
                self._scan_directory(directory, db_conn)
                scanned_dirs.append(directory.resolve())

        if not scanned_dirs:
            # スキャン実行済みディレクトリが1つもなければ is_available の更新はスキップ
            # （全ドライブ未接続時に全レコードのフラグを落とさないための安全策）
            logger.info(
                "operation=scan dirs=0 skipped=true reason=no_scanned_dirs"
            )
            return

        # スキャンで見つからなかった全動画を is_available=0 に更新
        cursor = db_conn.execute("SELECT id, essential_filename, current_full_path FROM videos")
        all_videos = cursor.fetchall()

        unavailable_count = 0
        protected_count = 0
        for video in all_videos:
            video_id = video[0]
            essential_filename = video[1]
            current_full_path = video[2]

            if essential_filename not in self.found_files:
                if self._is_protected_path(current_full_path):
                    protected_count += 1
                    continue
                db_conn.execute(
                    "UPDATE videos SET is_available = 0 WHERE id = ?",
                    (video_id,)
                )
                unavailable_count += 1

        elapsed_ms = int((time.monotonic() - start_time) * 1000)
        logger.info(
            "operation=scan dirs=%d found=%d unavailable=%d protected=%d elapsed_ms=%d",
            len(scanned_dirs),
            len(self.found_files),
            unavailable_count,
            protected_count,
            elapsed_ms,
        )

    def scan_single_directory(self, directory: Path, db_conn) -> int:
        """
        指定ディレクトリのみをスキャンしてDB登録/更新を行う。
        他のディレクトリのレコードの is_available は変更しない。
        セレクションフォルダのスキャンに使用する。

        Args:
            directory: スキャン対象ディレクトリ
            db_conn: データベース接続

        Returns:
            int: 検出したファイル数
        """
        if not directory.exists() or not directory.is_dir():
            return 0
        self.found_files = set()
        resolved_directory = directory.resolve()
        self._scan_directory(resolved_directory, db_conn)
        self._mark_missing_in_directory_unavailable(resolved_directory, db_conn)
        return len(self.found_files)

    def _mark_missing_in_directory_unavailable(self, directory: Path, db_conn) -> None:
        rows = db_conn.execute(
            "SELECT id, essential_filename, current_full_path FROM videos"
        ).fetchall()
        for row in rows:
            if row[1] in self.found_files:
                continue
            if self._is_path_within_root(row[2], directory):
                db_conn.execute(
                    "UPDATE videos SET is_available = 0 WHERE id = ?",
                    (row[0],),
                )

    def _scan_directory(self, directory: Path, db_conn):
        """
        ディレクトリをスキャン

        Args:
            directory: スキャン対象ディレクトリ
            db_conn: データベース接続
        """
        for file_path in directory.rglob("*"):
            if file_path.is_file() and is_video_file(file_path):
                self._process_file(file_path, db_conn)

    def _process_file(self, file_path: Path, db_conn):
        """
        個別ファイルの処理

        Args:
            file_path: ファイルパス
            db_conn: データベース接続
        """
        # お気に入りレベルと本質的ファイル名を抽出
        level, essential, needs_selection, is_sel_completed = extract_essential_filename(file_path.name)

        # スキャンで見つかったファイルとして記録
        self.found_files.add(essential)

        # ファイル情報を取得
        file_stat = file_path.stat()
        file_size = file_stat.st_size
        storage_location = determine_storage_location(file_path)
        performer = extract_performer(file_path)
        last_modified = datetime.fromtimestamp(file_stat.st_mtime)
        # Windowsでは st_ctime がファイル作成時刻を示す
        file_created = datetime.fromtimestamp(file_stat.st_ctime)

        # データベースに既存レコードがあるか確認
        cursor = db_conn.execute(
            "SELECT * FROM videos WHERE essential_filename = ?",
            (essential,)
        )
        existing = cursor.fetchone()

        if existing:
            # 更新（ファイルが見つかったので is_available=1 に設定）
            db_conn.execute("""
                UPDATE videos
                SET current_full_path = ?,
                    current_favorite_level = ?,
                    storage_location = ?,
                    last_file_modified = ?,
                    file_created_at = ?,
                    is_available = 1,
                    needs_selection = ?,
                    is_selection_completed = ?,
                    last_scanned_at = CURRENT_TIMESTAMP
                WHERE essential_filename = ?
            """, (str(file_path), level, storage_location, last_modified, file_created,
                  1 if needs_selection else 0, 1 if is_sel_completed else 0, essential))
        else:
            # 新規追加（デフォルトで is_available=1, is_deleted=0）
            db_conn.execute("""
                INSERT INTO videos (
                    essential_filename, current_full_path, current_favorite_level,
                    file_size, performer, storage_location, last_file_modified,
                    file_created_at, is_available, is_deleted, needs_selection,
                    is_selection_completed, last_scanned_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 0, ?, ?, CURRENT_TIMESTAMP)
            """, (essential, str(file_path), level, file_size, performer, storage_location,
                  last_modified, file_created, 1 if needs_selection else 0, 1 if is_sel_completed else 0))
