"""
ClipBox - 設定ファイル
アプリケーション全体の設定を管理
"""

from pathlib import Path

# プロジェクトルートディレクトリ
PROJECT_ROOT = Path(__file__).parent

# スキャン対象ディレクトリ
# TODO: 実際の環境に合わせて修正してください
SCAN_DIRECTORIES = [
    Path("C:/Users/YourName/Videos"),
    # Path("E:/Videos"),  # 外付けHDD（必要に応じてコメント解除）
]

# データベースパス
DATABASE_PATH = PROJECT_ROOT / "data" / "videos.db"

# 対応する動画拡張子
VIDEO_EXTENSIONS = ['.mp4', '.avi', '.mkv', '.mov', '.wmv', '.flv', '.webm']

# お気に入りレベルの表示名
FAVORITE_LEVEL_NAMES = {
    0: '通常',
    1: 'やや気に入っている',
    2: 'お気に入り',
    3: '最もお気に入り',
    4: '超お気に入り',
}

# ファイルアクセス検知の閾値（日数）
FILE_ACCESS_DETECTION_DAYS = 1

# データベースバックアップディレクトリ
BACKUP_DIR = PROJECT_ROOT / "data" / "backups"
