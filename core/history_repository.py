"""
play_history テーブル用のリポジトリ関数を提供します。
現状は再生履歴の挿入機能のみを実装します。
将来的に取得検索機能を追加する場合は本モジュールに実装してください。
"""

from typing import Optional

from core.database import get_db_connection


def insert_play_history(
    file_path: str,
    title: str,
    player: str,
    library_root: str,
    trigger: str,
    video_id: Optional[int] = None,
    internal_id: Optional[str] = None,
) -> None:
    """
    play_history に 1 件の再生レコードを挿入します。

    Args:
        file_path: 再生したファイルの絶対パス
        title: 表示用のタイトル（プレフィックス除外）
        player: 使用したプレイヤー名 (vlc, gom 等)
        library_root: ライブラリのルートパス
        trigger: 再生トリガー（row_button, title_click 等）
        internal_id: オプションの内部ID
    """
    with get_db_connection() as conn:
        conn.execute(
            """
            INSERT INTO play_history
                (video_id, file_path, title, internal_id, player, library_root, trigger, played_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            """,
            (video_id, file_path, title, internal_id, player, library_root, trigger),
        )
