"""
ClipBox - ロガー設定
アプリケーション全体で共有するロガーを提供する
"""

import logging
import logging.handlers
from pathlib import Path


def get_logger(name: str) -> logging.Logger:
    """
    clipboxロガーを返す。同一名の2重セットアップを防ぐ。

    Args:
        name: ロガー名（モジュール名を推奨）

    Returns:
        logging.Logger: 設定済みロガー
    """
    logger = logging.getLogger(name)
    if logger.handlers:
        return logger

    logger.setLevel(logging.DEBUG)

    fmt = logging.Formatter(
        "%(asctime)s [%(levelname)s] %(message)s",
        datefmt="%Y-%m-%dT%H:%M:%S",
    )

    # コンソール（INFO以上）
    ch = logging.StreamHandler()
    ch.setLevel(logging.INFO)
    ch.setFormatter(fmt)
    logger.addHandler(ch)

    # ファイル（DEBUG以上、5MB×3世代）
    log_file = Path(__file__).parent.parent / "data" / "clipbox.log"
    log_file.parent.mkdir(exist_ok=True)
    fh = logging.handlers.RotatingFileHandler(
        log_file, maxBytes=5 * 1024 * 1024, backupCount=3, encoding="utf-8"
    )
    fh.setLevel(logging.DEBUG)
    fh.setFormatter(fmt)
    logger.addHandler(fh)

    return logger
