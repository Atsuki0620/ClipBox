"""
ClipBox - ファイルスキャン機能
動画ファイルのスキャンと識別を行う
"""

import re
from pathlib import Path
from typing import List, Optional, Tuple
from datetime import datetime

from config import VIDEO_EXTENSIONS


def extract_essential_filename(filename: str) -> Tuple[int, str]:
    """
    ファイル名からお気に入りレベルと本質的ファイル名を抽出

    Args:
        filename: 元のファイル名（例: "###_作品名.mp4"）

    Returns:
        (favorite_level, essential_filename) のタプル
        例: (3, "作品名.mp4")
    """
    # プレフィックスパターン: 0個以上の#に続く_
    match = re.match(r'^(#{0,})_(.+)$', filename)

    if match:
        prefix = match.group(1)
        essential = match.group(2)
        level = len(prefix)  # #の個数 = お気に入りレベル
        return level, essential
    else:
        # プレフィックスがない場合
        return 0, filename


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

    def __init__(self, scan_directories: List[Path]):
        """
        Args:
            scan_directories: スキャン対象ディレクトリのリスト
        """
        self.scan_directories = scan_directories

    def scan_and_update(self, db_conn):
        """
        ファイルをスキャンしてデータベースを更新

        Args:
            db_conn: データベース接続
        """
        for directory in self.scan_directories:
            if directory.exists():
                self._scan_directory(directory, db_conn)

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
        level, essential = extract_essential_filename(file_path.name)

        # ファイル情報を取得
        file_size = file_path.stat().st_size
        storage_location = determine_storage_location(file_path)
        performer = extract_performer(file_path)
        last_modified = datetime.fromtimestamp(file_path.stat().st_mtime)

        # データベースに既存レコードがあるか確認
        cursor = db_conn.execute(
            "SELECT * FROM videos WHERE essential_filename = ?",
            (essential,)
        )
        existing = cursor.fetchone()

        if existing:
            # 更新
            db_conn.execute("""
                UPDATE videos
                SET current_full_path = ?,
                    current_favorite_level = ?,
                    storage_location = ?,
                    last_file_modified = ?,
                    last_scanned_at = CURRENT_TIMESTAMP
                WHERE essential_filename = ?
            """, (str(file_path), level, storage_location, last_modified, essential))
        else:
            # 新規追加
            db_conn.execute("""
                INSERT INTO videos (
                    essential_filename, current_full_path, current_favorite_level,
                    file_size, performer, storage_location, last_file_modified, last_scanned_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            """, (essential, str(file_path), level, file_size, performer, storage_location, last_modified))
