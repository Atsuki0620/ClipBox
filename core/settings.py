"""
ClipBox - アプリケーション設定管理
最終チェック日時などの動的な設定を管理
"""

import json
from pathlib import Path
from datetime import datetime
from typing import Optional

from config import PROJECT_ROOT


# 設定ファイルのパス
SETTINGS_FILE = PROJECT_ROOT / "data" / "app_settings.json"


def load_settings() -> dict:
    """
    設定ファイルを読み込む

    Returns:
        dict: 設定内容
    """
    if not SETTINGS_FILE.exists():
        return {
            'last_access_check_time': None
        }

    try:
        with open(SETTINGS_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"設定ファイルの読み込みエラー: {e}")
        return {
            'last_access_check_time': None
        }


def save_settings(settings: dict):
    """
    設定ファイルに保存

    Args:
        settings: 保存する設定内容
    """
    # dataディレクトリが存在しない場合は作成
    SETTINGS_FILE.parent.mkdir(parents=True, exist_ok=True)

    try:
        with open(SETTINGS_FILE, 'w', encoding='utf-8') as f:
            json.dump(settings, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"設定ファイルの保存エラー: {e}")


def get_last_access_check_time() -> Optional[datetime]:
    """
    最終アクセスチェック日時を取得

    Returns:
        Optional[datetime]: 最終チェック日時、未設定の場合はNone
    """
    settings = load_settings()
    time_str = settings.get('last_access_check_time')

    if time_str is None:
        return None

    try:
        return datetime.fromisoformat(time_str)
    except Exception as e:
        print(f"日時の解析エラー: {e}")
        return None


def update_last_access_check_time(check_time: Optional[datetime] = None):
    """
    最終アクセスチェック日時を更新

    Args:
        check_time: チェック日時（Noneの場合は現在時刻）
    """
    if check_time is None:
        check_time = datetime.now()

    settings = load_settings()
    settings['last_access_check_time'] = check_time.isoformat()
    save_settings(settings)
