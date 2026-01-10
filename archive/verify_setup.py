"""
ClipBox - セットアップ検証スクリプト
データベースとモジュールの動作を確認します
"""

import sys
from pathlib import Path

from core.database import check_database_exists, get_db_connection, DATABASE_PATH
from core.scanner import extract_essential_filename
from core.models import Video
from config import SCAN_DIRECTORIES, VIDEO_EXTENSIONS


def check_database():
    """データベースの確認"""
    print("=" * 60)
    print("データベースの確認")
    print("=" * 60)

    if not check_database_exists():
        print(f"[ERROR] データベースが見つかりません: {DATABASE_PATH}")
        print("  -> python setup_db.py を実行してください")
        return False

    print(f"[OK] データベースファイルが存在します: {DATABASE_PATH}")

    # テーブルの確認
    try:
        with get_db_connection() as conn:
            cursor = conn.execute(
                "SELECT name FROM sqlite_master WHERE type='table'"
            )
            tables = [row[0] for row in cursor.fetchall()]

            expected_tables = ['videos', 'viewing_history']
            missing_tables = [t for t in expected_tables if t not in tables]

            if missing_tables:
                print(f"[ERROR] 必要なテーブルが見つかりません: {missing_tables}")
                return False

            print(f"[OK] 必要なテーブルが存在します: {expected_tables}")

            # 各テーブルのレコード数を確認
            for table in expected_tables:
                cursor = conn.execute(f"SELECT COUNT(*) FROM {table}")
                count = cursor.fetchone()[0]
                print(f"  - {table}: {count} レコード")

    except Exception as e:
        print(f"[ERROR] データベース接続エラー: {e}")
        return False

    print()
    return True


def check_scanner():
    """スキャナーモジュールの確認"""
    print("=" * 60)
    print("スキャナーモジュールの確認")
    print("=" * 60)

    test_cases = [
        ("###_作品名.mp4", 3, "作品名.mp4"),
        ("##_作品名.mp4", 2, "作品名.mp4"),
        ("#_作品名.mp4", 1, "作品名.mp4"),
        ("_作品名.mp4", 0, "作品名.mp4"),
        ("作品名.mp4", 0, "作品名.mp4"),
    ]

    all_passed = True
    for filename, expected_level, expected_essential in test_cases:
        level, essential = extract_essential_filename(filename)
        if level == expected_level and essential == expected_essential:
            print(f"[OK] {filename} -> レベル{level}, {essential}")
        else:
            print(f"[ERROR] {filename} -> 期待: レベル{expected_level}, {expected_essential}")
            print(f"          実際: レベル{level}, {essential}")
            all_passed = False

    print()
    return all_passed


def check_config():
    """設定の確認"""
    print("=" * 60)
    print("設定の確認")
    print("=" * 60)

    print(f"スキャン対象ディレクトリ:")
    for directory in SCAN_DIRECTORIES:
        if directory.exists():
            print(f"  [OK] {directory} (存在します)")
        else:
            print(f"  [!] {directory} (存在しません)")

    print(f"\n対応する動画拡張子: {', '.join(VIDEO_EXTENSIONS)}")
    print()
    return True


def check_models():
    """データモデルの確認"""
    print("=" * 60)
    print("データモデルの確認")
    print("=" * 60)

    try:
        # Videoモデルのインスタンス作成テスト
        test_video = Video(
            id=None,
            essential_filename="テスト動画.mp4",
            current_full_path="C:/test/テスト動画.mp4",
            current_favorite_level=3,
            file_size=1024000,
            performer="テスト俳優",
            storage_location="C_DRIVE",
            last_file_modified=None,
            created_at=None,
            last_scanned_at=None,
            notes="テスト用"
        )

        print(f"[OK] Videoモデルのインスタンス作成成功")
        print(f"  表示名: {test_video.display_name}")

    except Exception as e:
        print(f"[ERROR] データモデルのテストエラー: {e}")
        return False

    print()
    return True


def main():
    """セットアップ検証のメイン処理"""
    print()
    print("ClipBox セットアップ検証")
    print()

    results = {
        "データベース": check_database(),
        "スキャナー": check_scanner(),
        "設定": check_config(),
        "データモデル": check_models(),
    }

    print("=" * 60)
    print("検証結果サマリー")
    print("=" * 60)

    for name, passed in results.items():
        status = "[OK] 合格" if passed else "[ERROR] 不合格"
        print(f"{name}: {status}")

    print()

    if all(results.values()):
        print("[SUCCESS] すべての検証に合格しました！")
        print()
        print("次のステップ:")
        print("  streamlit run streamlit_app.py")
        print()
        return 0
    else:
        print("[!] 一部の検証に失敗しました。上記のエラーを確認してください。")
        print()
        return 1


if __name__ == "__main__":
    sys.exit(main())
