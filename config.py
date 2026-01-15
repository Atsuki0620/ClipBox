"""
ClipBox - 設定ファイル
アプリケーション全体の設定を管理
"""

from pathlib import Path

# プロジェクトルートディレクトリ
PROJECT_ROOT = Path(__file__).parent

# スキャン対象ディレクトリ
SCAN_DIRECTORIES = [
    Path(r"C:\Users\atsuk\OneDrive\ドキュメント\data\ClipBox_TEST"),
    # 追加のディレクトリがある場合はここに追加
    # Path("E:/Videos"),  # 外付けHDD
]

# データベースパス
DATABASE_PATH = PROJECT_ROOT / "data" / "videos.db"

# 対応する動画拡張子
VIDEO_EXTENSIONS = ['.mp4', '.avi', '.mkv', '.mov', '.wmv', '.flv', '.webm']

# お気に入りレベルの表示名
FAVORITE_LEVEL_NAMES = {
    -1: '未判定',
    0: 'レベル0',
    1: 'レベル1',
    2: 'レベル2',
    3: 'レベル3',
    4: 'レベル4',
}

# ファイルアクセス検知の閾値（日数）
FILE_ACCESS_DETECTION_DAYS = 1

# データベースバックアップディレクトリ
BACKUP_DIR = PROJECT_ROOT / "data" / "backups"
