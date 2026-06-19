# archive 参照監査（2026-06-19）

## 目的

ルート `archive/` 直下の旧 Python コードと `unused_tabs/` について、現行の Next.js + FastAPI 実行領域から参照されていないことを確認し、将来の物理再編を判断するための分類を残す。

この監査は読み取りのみで行った。旧スクリプトは DB・設定・スナップショットへ書き込めるものを含むため、実行していない。ファイルの移動・削除も行っていない。

## 対象と基準

- 現行領域: `api/`、`api_app.py`、`core/`、`frontend/`、`scripts/`、`tests/`、`config.py`、`run_dev.bat`、`run_api.bat`
- legacy 領域: `archive/`（旧 Streamlit UI を含む）
- 正本: `docs/context/OVERVIEW.md`、`docs/context/SPEC_NEXTJS.md`、`docs/context/AI_WORKFLOW.md`、`docs/context/TESTING.md`
- 基準コミット: `bf311ba`（`main` とローカルの `origin/main` 追跡参照に差分なし。network fetch は未実施）

監査時点の tracked ファイルは 377 件、うち `archive/` は 59 件、`archive/` 直下の Python ファイルは 12 件だった。

## 参照監査結果

| 確認項目 | 結果 |
|---|---|
| 現行領域の `from archive` / `import archive` | 0 件 |
| 現行領域の旧ファイル名参照（`setup_db.py`、`counter_service.py`、`snapshot.py`、`config_store.py`、`history_repository.py`、`analysis_tab_v2.py`） | 0 件 |
| 旧 Streamlit UI 内の `python archive/setup_db.py` 表示文字列 | 1 件（`archive/streamlit/streamlit_app.py:144`） |
| `archive/*.py` と `unused_tabs/` の現行実行経路への組み込み | なし |

一致なしによる検索コマンドの終了コード 1 は、0 件という正常な監査結果として扱った。歴史資料と archive 内部には旧パス・旧ファイル名への参照が残るため、物理移動時はそれらも更新対象になる。

## 旧コードの分類

| 分類 | 対象 | 判断根拠・注意点 |
|---|---|---|
| 互換 shim | `config_store.py`、`history_repository.py` | 現行 `core` の関数を再公開するだけの旧 import 互換層。現行領域からは参照されていない |
| 廃止機能 | `counter_service.py`、`settings.py`、`snapshot.py` | archived の counters、アクセス検知用設定、スナップショット機能。DB またはローカル設定へ書き込めるため実行対象に戻さない |
| 手動ユーティリティ | `create_test_data.py`、`inspect_database.py`、`setup_db.py`、`verify_setup.py` | 旧データ作成・検査・初期化・検証スクリプト。特に `setup_db.py` は既存 DB の削除・再作成経路を持つ |
| 無効化済み断片 | `detect_file_access.py`、`video_manager_methods.py` | コメントアウト退避された旧機能。単体の現行実装ではない |
| 旧 UI | `analysis_tab_v2.py` | Streamlit / Plotly を使う旧分析タブ。現行 UI は Next.js であり参照なし |
| 未使用の旧 UI | `unused_tabs/extra_tabs_unused.py`、`unused_tabs/random_tab.py` | 旧 Streamlit タブの退避物。現行領域から参照なし |

この分類は機能の正本ではない。`is_judging`、counters、スナップショット等を現行機能として復活させる根拠には使用しない。

## 物理移動を見送る理由

- 現行実行領域には参照がないため、今回の目的に移動・削除は不要。
- 旧 Streamlit UI に `archive/setup_db.py` の表示文字列が残り、移動すると案内がさらに不正確になる。
- `docs/context/`、`docs/reports/`、archive 内の歴史資料に旧パス参照があり、移動は広い参照更新とレビューを要する。
- DB や設定へ書き込める旧ツールを再配置すると、現行ツールと誤認されるリスクがある。

将来 `archive/legacy-code/` を導入する場合は、挙動変更を混ぜない別 Pull request とし、全参照更新、現行領域からの import 不在、旧 Streamlit UI の退避状態、DB バックアップ要否を同時に確認する。

## 今回の非対象

- `archive/` 内の物理配置変更・削除
- ignore 済みローカルファイルの削除
- `.gitignore` の変更
- `data/`、`artifacts/`、DB、動画、個人設定
- `core/`、`api/`、`frontend/`、`scripts/`、`tests/` の実装・挙動
