# archive/legacy-code/setup/ — 旧セットアップ対

このディレクトリは、Streamlit 期の旧セットアップ用 CLI を保管する歴史資料です。現行導線では使いません。

## ファイル

- `setup_db.py`: 旧DB初期化 CLI。**既存DBを削除して再作成し得るため、絶対に実行しないこと。**
- `verify_setup.py`: 旧セットアップ検証 CLI（DBは読み取りのみ）。

## 注意

- 現行のDB初期化・マイグレーションは `core/database.py` / `core/migration.py` が担当します。セットアップは `run_dev.bat`（起動時バックアップ → マイグレーション）に統合済みで、ここのスクリプトは使いません。
- 旧 Streamlit UI（`archive/streamlit/streamlit_app.py`）の DB 未検出時の案内表示も、現在のパス `python archive/legacy-code/setup/setup_db.py` に補正済みです。あわせて「通常導線では使わない／実行前にバックアップと目的確認が必須」の注意も表示します。旧 UI は通常起動しません。
- 復旧や参照が必要な場合も、現行セットアップとして扱わず、独立した検証作業として扱ってください。
