"""
Config utilities.
外部挙動は変えず、UI からの設定読書きをここに集約する。
"""

import json
from pathlib import Path
from typing import Dict, Any

from config import PROJECT_ROOT, SCAN_DIRECTORIES, DATABASE_PATH

CONFIG_PATH = PROJECT_ROOT / "data" / "user_config.json"


def _default_config() -> Dict[str, Any]:
    return {
        "library_roots": [str(p) for p in SCAN_DIRECTORIES],
        "default_player": "vlc",
        "avp_exe_path": r"C:\Program Files (x86)\Awesome Video Player\AVPlayer.exe",
        "db_path": str(DATABASE_PATH),
        "fate_tier1_recently_unwatched_priority": False,
        "fate_tier2_recently_unwatched_priority": False,
        "card_show_storage": True,
        "card_show_file_size": False,
        "card_show_last_viewed": False,
        "card_show_pending_badge": True,
        "card_show_score": False,
        "card_show_file_modified": False,
        "card_title_max_length": 0,
    }


def load_user_config() -> Dict[str, Any]:
    """
    設定ファイルを読み込み、デフォルト値とマージして返す。
    存在しない場合はデフォルトを返す。
    """
    config = _default_config()

    if CONFIG_PATH.exists():
        try:
            file_config = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
            if isinstance(file_config, dict):
                config.update(file_config)
        except Exception:
            # 読み込み失敗時はデフォルトで継続
            pass

    # library_roots は文字列リストに揃える
    library_roots = config.get("library_roots", [])
    config["library_roots"] = [str(p) for p in library_roots]

    # default_player フォールバック
    config["default_player"] = config.get("default_player", "vlc")

    # avp_exe_path フォールバック
    config["avp_exe_path"] = config.get(
        "avp_exe_path",
        r"C:\Program Files (x86)\Awesome Video Player\AVPlayer.exe",
    )

    # db_path フォールバック
    config["db_path"] = config.get("db_path", str(DATABASE_PATH))

    config["fate_tier1_recently_unwatched_priority"] = bool(
        config.get("fate_tier1_recently_unwatched_priority", False)
    )
    config["fate_tier2_recently_unwatched_priority"] = bool(
        config.get("fate_tier2_recently_unwatched_priority", False)
    )

    return config


def save_user_config(config: Dict[str, Any]) -> None:
    """
    設定を JSON で保存する。
    """
    CONFIG_PATH.parent.mkdir(parents=True, exist_ok=True)
    CONFIG_PATH.write_text(json.dumps(config, ensure_ascii=False, indent=2), encoding="utf-8")
