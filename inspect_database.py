"""
ClipBox - データベース検査スクリプト
SQLiteデータベースの中身を詳しく確認します
"""

import sqlite3
from pathlib import Path
from config import DATABASE_PATH


def inspect_database():
    """データベースの内容を詳しく表示"""
    print("=" * 80)
    print(f"データベース検査: {DATABASE_PATH}")
    print("=" * 80)
    print()

    if not DATABASE_PATH.exists():
        print("[ERROR] データベースファイルが見つかりません")
        return

    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    # テーブル一覧を取得
    print("【1】テーブル一覧")
    print("-" * 80)
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = [row[0] for row in cursor.fetchall()]
    for table in tables:
        print(f"  - {table}")
    print()

    # 各テーブルの構造を表示
    print("【2】テーブル構造")
    print("-" * 80)
    for table in tables:
        print(f"\n■ {table} テーブル")
        cursor.execute(f"PRAGMA table_info({table})")
        columns = cursor.fetchall()

        print(f"  カラム数: {len(columns)}")
        print()
        print("  | No | カラム名 | 型 | NULL許可 | デフォルト値 | 主キー |")
        print("  |----|----------|-----|----------|--------------|--------|")
        for col in columns:
            print(f"  | {col[0]} | {col[1]} | {col[2]} | "
                  f"{'NO' if col[3] else 'YES'} | {col[4] or '-'} | "
                  f"{'YES' if col[5] else 'NO'} |")
    print()

    # データの内容を表示
    print("【3】データ内容")
    print("-" * 80)

    # videosテーブルのデータ
    print("\n■ videos テーブルのデータ")
    cursor.execute("SELECT COUNT(*) FROM videos")
    count = cursor.fetchone()[0]
    print(f"  総レコード数: {count} 件")
    print()

    if count > 0:
        cursor.execute("""
            SELECT id, essential_filename, current_favorite_level,
                   file_size, performer, storage_location
            FROM videos
            ORDER BY current_favorite_level DESC
        """)

        print("  | ID | ファイル名 | レベル | サイズ(MB) | 登場人物 | 保存場所 |")
        print("  |----|-----------|--------|-----------|---------|----------|")
        for row in cursor.fetchall():
            size_mb = row[3] / (1024*1024) if row[3] else 0
            performer = row[4] if row[4] else "未設定"
            location = "Cドライブ" if row[5] == "C_DRIVE" else "外付けHDD"
            print(f"  | {row[0]} | {row[1][:30]}... | {row[2]} | "
                  f"{size_mb:.1f} | {performer[:10]} | {location} |")
    print()

    # viewing_historyテーブルのデータ
    print("■ viewing_history テーブルのデータ")
    cursor.execute("SELECT COUNT(*) FROM viewing_history")
    count = cursor.fetchone()[0]
    print(f"  総レコード数: {count} 件")
    print()

    if count > 0:
        # 視聴回数の集計
        cursor.execute("""
            SELECT v.id, v.essential_filename, COUNT(vh.id) as view_count,
                   MAX(vh.viewed_at) as last_viewed
            FROM videos v
            LEFT JOIN viewing_history vh ON v.id = vh.video_id
            WHERE vh.id IS NOT NULL
            GROUP BY v.id
            ORDER BY view_count DESC
        """)

        print("  | 動画ID | ファイル名 | 視聴回数 | 最終視聴日時 |")
        print("  |--------|-----------|---------|--------------|")
        for row in cursor.fetchall():
            print(f"  | {row[0]} | {row[1][:30]}... | {row[2]} | {row[3][:19]} |")
        print()

        # 直近の視聴履歴（最新5件）
        print("  【直近の視聴履歴（最新5件）】")
        cursor.execute("""
            SELECT vh.id, vh.video_id, v.essential_filename,
                   vh.viewed_at, vh.viewing_method
            FROM viewing_history vh
            JOIN videos v ON vh.video_id = v.id
            ORDER BY vh.viewed_at DESC
            LIMIT 5
        """)

        print("  | 履歴ID | 動画ID | ファイル名 | 視聴日時 | 記録方法 |")
        print("  |--------|--------|-----------|----------|----------|")
        for row in cursor.fetchall():
            method = "アプリ再生" if row[4] == "APP_PLAYBACK" else row[4]
            print(f"  | {row[0]} | {row[1]} | {row[2][:25]}... | "
                  f"{row[3][:19]} | {method} |")
    print()

    # インデックス情報
    print("【4】インデックス情報")
    print("-" * 80)
    cursor.execute("""
        SELECT name, tbl_name, sql
        FROM sqlite_master
        WHERE type='index' AND sql IS NOT NULL
    """)
    indexes = cursor.fetchall()

    if indexes:
        for idx in indexes:
            print(f"  インデックス名: {idx[0]}")
            print(f"  テーブル: {idx[1]}")
            print(f"  SQL: {idx[2]}")
            print()
    else:
        print("  インデックスがありません")
    print()

    # データベースファイルのサイズ
    print("【5】データベースファイル情報")
    print("-" * 80)
    file_size = DATABASE_PATH.stat().st_size
    print(f"  ファイルパス: {DATABASE_PATH}")
    print(f"  ファイルサイズ: {file_size:,} bytes ({file_size/1024:.2f} KB)")
    print()

    conn.close()

    print("=" * 80)
    print("検査完了")
    print("=" * 80)


if __name__ == "__main__":
    inspect_database()
