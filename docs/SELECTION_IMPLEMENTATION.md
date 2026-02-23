# セレクションタブ 実装状況

## 概要

外付けHDDの`?`プレフィックス付き未選別動画を管理するための専用タブ。
「フォルダスキャン → カード表示 → 再生・判定 → 進捗確認」のサイクルを効率化。

## 実装進捗

| Phase | 内容 | 状態 |
|-------|------|------|
| Phase 1 | 基盤整備（scanner・DB・モデル変更） | ✅ 完了 |
| Phase 2 | セレクションタブ実装 | ✅ 完了 |
| Phase 3 | 分析タブへのセレクション分析追加 | ✅ 完了 |

## 変更ファイル一覧

| ファイル | 変更種別 | 内容 |
|---------|---------|------|
| `core/scanner.py` | 修正 | 3タプル対応（既実装）、_process_fileにneeds_selection追加 |
| `core/database.py` | 修正 | needs_selection, was_selection_judgmentカラム追加 |
| `core/models.py` | 修正 | needs_selectionフィールド追加 |
| `core/video_manager.py` | 修正 | _row_to_video, get_videos, set_favorite_level_with_rename |
| `ui/unrated_random_tab.py` | 修正 | _row_to_videoにneeds_selection追加 |
| `tests/test_scanner.py` | 修正 | 3タプル対応 |
| `core/selection_service.py` | 新規作成 | セレクション固有ビジネスロジック |
| `ui/selection_tab.py` | 新規作成 | セレクションタブUI |
| `core/app_service.py` | 修正 | selection_service公開 |
| `ui/components/video_card.py` | 修正 | 未選別バッジ追加 |
| `streamlit_app.py` | 修正 | タブ登録 |
| `core/analysis_service.py` | 修正 | セレクション分析関数追加 |
| `ui/analysis_tab.py` | 修正 | セレクション分析セクション追加 |

## データベース変更

### videosテーブル追加カラム
- `needs_selection BOOLEAN DEFAULT 0`: ファイル名に`?`プレフィックスが付いていた場合True

### judgment_historyテーブル追加カラム
- `was_selection_judgment BOOLEAN DEFAULT 0`: セレクション判定かどうか

## 検証方法

1. セレクションタブでフォルダパス入力 → スキャン → カード表示
2. 動画再生 → 判定 → `?`プレフィックス除去・ファイルリネーム確認
3. KPI数値が判定後に更新されること
4. 既存タブ（ライブラリ、未判定ランダム）が正常動作すること
5. 分析タブ最下部に「セレクション成果分析」セクション表示

## 実装日時

2026-02-23
