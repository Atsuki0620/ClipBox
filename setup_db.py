"""
ClipBox - データベース初期化スクリプト
初回セットアップ時にデータベースとテーブルを作成します
"""

from core.database import init_database, check_database_exists, DATABASE_PATH


def main():
    """データベースの初期化を実行"""
    print("=" * 60)
    print("ClipBox - データベース初期化スクリプト")
    print("=" * 60)
    print()

    # データベースの存在確認
    if check_database_exists():
        print(f"[!] データベースが既に存在します: {DATABASE_PATH}")
        response = input("既存のデータベースを削除して再作成しますか？ (y/N): ")
        if response.lower() != 'y':
            print("処理を中止しました。")
            return

        # 既存のデータベースを削除
        DATABASE_PATH.unlink()
        print(f"[OK] 既存のデータベースを削除しました")

    # データベースの初期化
    print(f"データベースを作成しています: {DATABASE_PATH}")
    try:
        init_database()
        print("[OK] データベースの初期化が完了しました")
        print()
        print("作成されたテーブル:")
        print("  - videos (動画情報)")
        print("  - viewing_history (視聴履歴)")
        print("  - play_history (再生履歴)")
        print()
        print("[OK] セットアップが正常に完了しました！")
        print()
        print("次のステップ:")
        print("  1. config.py のスキャンディレクトリを設定")
        print("  2. python verify_setup.py でセットアップを確認")
        print("  3. streamlit run streamlit_app.py でアプリを起動")

    except Exception as e:
        print(f"[ERROR] エラーが発生しました: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()
