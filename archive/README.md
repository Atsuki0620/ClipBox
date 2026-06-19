# archive/ — ルート archive の扱い

このディレクトリは実行対象ではありません。過去の Streamlit 期コード断片、旧設計メモ、退避済み実装を保管する歴史資料です。

## 位置づけ

- 現行仕様の正本ではありません。
- 現行仕様は `docs/context/` 配下の正本、特に `OVERVIEW.md`、`SPEC_NEXTJS.md`、`AI_WORKFLOW.md`、`TESTING.md` を参照してください。
- `archive/legacy-code/` は、現行実行経路から参照されない旧コード断片の隔離先です。import 可能に見えても現行コードとして扱いません。
- `archive/streamlit/` は Phase 5 で退避した旧 Streamlit UI であり、`archive/legacy-code/` とは別枠です。通常導線では起動しません。
- `archive/setup_db.py` と `archive/verify_setup.py` は旧セットアップ対としてルート直下に残しています。どちらも通常導線では実行しません。
- `archive/legacy-docs/` は未導入です。既存の Markdown は現在の配置に残します。

## 禁止事項

- `archive/legacy-code/` または `archive/streamlit/` から現行コードへ import / 参照を追加しない。
- `archive/` 配下の旧コードを、仕様確認なしに現行機能として復活させない。
- archived 機能（例: `is_judging`、`counters`、スナップショット等）を現行機能と誤認しない。

## 再利用前に確認すること

`archive/legacy-code/` または `archive/streamlit/` を復旧元として使う必要がある場合は、別の設計・検証作業として扱い、作業前に少なくとも以下を確認してください。

- 現行コードからの import / 参照関係。
- `docs/context/` の正本との差分。
- 対象機能のテスト方針と回帰範囲。
- DB 書き込みやスキーマに触れる場合のバックアップ要否。

物理移動や復活は、挙動変更を混ぜない単独 Pull request で行います。
