"""
ClipBox - テストデータ作成スクリプト
開発・動作確認用のテストデータをデータベースに挿入します
"""

from datetime import datetime, timedelta
import random
from core.database import get_db_connection


def create_test_data():
    """テストデータの作成"""
    print("=" * 60)
    print("ClipBox - テストデータ作成")
    print("=" * 60)
    print()

    # テストデータ定義
    test_videos = [
        # お気に入りレベル3
        {
            'essential_filename': '素晴らしい作品A.mp4',
            'current_full_path': 'C:/TestVideos/###_素晴らしい作品A.mp4',
            'current_favorite_level': 3,
            'file_size': 150000000,
            'performer': '俳優A',
            'storage_location': 'C_DRIVE',
        },
        {
            'essential_filename': '感動作品B.mp4',
            'current_full_path': 'C:/TestVideos/###_感動作品B.mp4',
            'current_favorite_level': 3,
            'file_size': 200000000,
            'performer': '俳優B',
            'storage_location': 'C_DRIVE',
        },
        # お気に入りレベル2
        {
            'essential_filename': '良い作品C.mp4',
            'current_full_path': 'C:/TestVideos/##_良い作品C.mp4',
            'current_favorite_level': 2,
            'file_size': 180000000,
            'performer': '俳優A',
            'storage_location': 'C_DRIVE',
        },
        {
            'essential_filename': '面白い作品D.mp4',
            'current_full_path': 'E:/Videos/##_面白い作品D.mp4',
            'current_favorite_level': 2,
            'file_size': 220000000,
            'performer': '俳優C',
            'storage_location': 'EXTERNAL_HDD',
        },
        # お気に入りレベル1
        {
            'essential_filename': 'まあまあ作品E.mp4',
            'current_full_path': 'C:/TestVideos/#_まあまあ作品E.mp4',
            'current_favorite_level': 1,
            'file_size': 160000000,
            'performer': '俳優B',
            'storage_location': 'C_DRIVE',
        },
        {
            'essential_filename': '普通作品F.mp4',
            'current_full_path': 'E:/Videos/#_普通作品F.mp4',
            'current_favorite_level': 1,
            'file_size': 190000000,
            'performer': '俳優D',
            'storage_location': 'EXTERNAL_HDD',
        },
        # お気に入りレベル0
        {
            'essential_filename': '通常作品G.mp4',
            'current_full_path': 'E:/Videos/_通常作品G.mp4',
            'current_favorite_level': 0,
            'file_size': 140000000,
            'performer': '俳優C',
            'storage_location': 'EXTERNAL_HDD',
        },
        {
            'essential_filename': '一般作品H.mp4',
            'current_full_path': 'E:/Videos/_一般作品H.mp4',
            'current_favorite_level': 0,
            'file_size': 170000000,
            'performer': '俳優D',
            'storage_location': 'EXTERNAL_HDD',
        },
    ]

    with get_db_connection() as conn:
        # 既存データのクリア（確認）
        cursor = conn.execute("SELECT COUNT(*) FROM videos")
        existing_count = cursor.fetchone()[0]

        if existing_count > 0:
            print(f"[!] データベースに既に {existing_count} 件のデータが存在します。")
            response = input("既存データをクリアしてテストデータを作成しますか？ (y/N): ")
            if response.lower() != 'y':
                print("処理を中止しました。")
                return

            conn.execute("DELETE FROM viewing_history")
            conn.execute("DELETE FROM videos")
            print("[OK] 既存データをクリアしました。")
            print()

        # テスト動画データの挿入
        print(f"テストデータを作成中... ({len(test_videos)} 件)")

        for video in test_videos:
            conn.execute("""
                INSERT INTO videos (
                    essential_filename,
                    current_full_path,
                    current_favorite_level,
                    file_size,
                    performer,
                    storage_location,
                    last_file_modified,
                    last_scanned_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            """, (
                video['essential_filename'],
                video['current_full_path'],
                video['current_favorite_level'],
                video['file_size'],
                video['performer'],
                video['storage_location'],
                datetime.now()
            ))

        # 動画IDを取得
        cursor = conn.execute("SELECT id FROM videos")
        video_ids = [row[0] for row in cursor.fetchall()]

        # テスト視聴履歴の作成
        print("視聴履歴を作成中...")

        viewing_records = []
        for video_id in video_ids[:5]:  # 最初の5本に視聴履歴を追加
            # ランダムに3-10回の視聴履歴を作成
            view_count = random.randint(3, 10)
            for i in range(view_count):
                # 過去30日以内のランダムな日時
                days_ago = random.randint(0, 30)
                hours_ago = random.randint(0, 23)
                viewed_at = datetime.now() - timedelta(days=days_ago, hours=hours_ago)

                viewing_records.append((
                    video_id,
                    viewed_at,
                    'APP_PLAYBACK'
                ))

        # 視聴履歴を挿入
        for record in viewing_records:
            conn.execute("""
                INSERT INTO viewing_history (video_id, viewed_at, viewing_method)
                VALUES (?, ?, ?)
            """, record)

        conn.commit()

    print(f"[OK] テストデータの作成が完了しました！")
    print()
    print(f"作成された動画: {len(test_videos)} 本")
    print(f"作成された視聴履歴: {len(viewing_records)} 件")
    print()
    print("次のステップ:")
    print("  streamlit run streamlit_app.py")
    print()


if __name__ == "__main__":
    create_test_data()
