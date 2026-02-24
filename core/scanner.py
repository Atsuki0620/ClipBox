"""
ClipBox - ファイルスキャン機能
動画ファイルのスキャンと識別を行う
"""

import re
from pathlib import Path
from typing import List, Optional, Tuple
from datetime import datetime

from config import VIDEO_EXTENSIONS


def extract_essential_filename(filename: str) -> Tuple[int, str, bool, bool]:
    """
    ファイル名からお気に入りレベル、本質的ファイル名、セレクションフラグを抽出

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

    def __init__(self, scan_directories: List[Path]):
        """
        Args:
            scan_directories: スキャン対象ディレクトリのリスト
        """
        self.scan_directories = scan_directories
        self.found_files = set()  # スキャン中に見つかったファイルのessential_filenameを記録

    def scan_and_update(self, db_conn):
        """
        ファイルをスキャンしてデータベースを更新

        Args:
            db_conn: データベース接続
        """
        # スキャン前に見つかったファイルをリセット
        self.found_files = set()

        # 各ディレクトリをスキャン
        for directory in self.scan_directories:
            if directory.exists():
                self._scan_directory(directory, db_conn)

        # スキャンで見つからなかったファイルを is_available=0 に更新
        cursor = db_conn.execute("SELECT id, essential_filename FROM videos")
        all_videos = cursor.fetchall()

        for video in all_videos:
            video_id = video[0]
            essential_filename = video[1]

            if essential_filename not in self.found_files:
                # ファイルが見つからなかったので is_available=0 に設定
                db_conn.execute(
                    "UPDATE videos SET is_available = 0 WHERE id = ?",
                    (video_id,)
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
        self._scan_directory(directory, db_conn)
        return len(self.found_files)

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
        level, essential, needs_selection, _is_sel_completed = extract_essential_filename(file_path.name)

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
                    last_scanned_at = CURRENT_TIMESTAMP
                WHERE essential_filename = ?
            """, (str(file_path), level, storage_location, last_modified, file_created, 1 if needs_selection else 0, essential))
        else:
            # 新規追加（デフォルトで is_available=1, is_deleted=0）
            db_conn.execute("""
                INSERT INTO videos (
                    essential_filename, current_full_path, current_favorite_level,
                    file_size, performer, storage_location, last_file_modified,
                    file_created_at, is_available, is_deleted, needs_selection, last_scanned_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 0, ?, CURRENT_TIMESTAMP)
            """, (essential, str(file_path), level, file_size, performer, storage_location, last_modified, file_created, 1 if needs_selection else 0))


def detect_recently_accessed_files(last_check_time: Optional[datetime], db_conn) -> List[dict]:
    """
    最近アクセスされたファイルを検知

    Args:
        last_check_time: 前回チェック日時（Noneの場合は全期間）
        db_conn: データベース接続

    Returns:
        List[dict]: アクセスされたファイルの情報リスト
    """
    # データベースに登録されている動画を取得
    cursor = db_conn.execute("""
        SELECT id, essential_filename, current_full_path
        FROM videos
    """)
    videos = cursor.fetchall()

    accessed_files = []

    for video in videos:
        video_id = video[0]
        essential_filename = video[1]
        file_path = Path(video[2])

        # ファイルが存在しない場合はスキップ
        if not file_path.exists():
            continue

        try:
            # ファイルの最終アクセス日時を取得
            access_time = datetime.fromtimestamp(file_path.stat().st_atime)

            # 前回チェック以降にアクセスされているかチェック
            if last_check_time is None or access_time > last_check_time:
                accessed_files.append({
                    'video_id': video_id,
                    'essential_filename': essential_filename,
                    'file_path': str(file_path),
                    'access_time': access_time
                })
        except Exception as e:
            print(f"ファイルアクセス情報の取得エラー ({file_path}): {e}")
            continue

    # アクセス日時でソート（古い順）
    accessed_files.sort(key=lambda x: x['access_time'])

    return accessed_files
