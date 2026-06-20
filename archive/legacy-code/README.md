# archive/legacy-code/ — 隔離した旧コード断片

このディレクトリは、現行の Next.js + FastAPI 実装から参照されない旧 Python コードの隔離先です。Phase 1（2026-06-20）で `archive/` 直下と `archive/unused_tabs/` から移動しました。

## 位置づけ

- 現行コードではありません。import 可能に見えても現行実行経路では使いません。
- 現行仕様の正本は `docs/context/`（特に `OVERVIEW.md`・`SPEC_NEXTJS.md`）です。
- 導入判断と移動記録は `docs/reports/ARCHIVE_LEGACY_CODE_DECISION_20260619.md` を参照してください。

## 構成

- 直下: 旧分析 UI・旧互換 shim・廃止済み機能（counters / snapshot / アクセス検知等）の断片。
- `unused_tabs/`: 旧 Streamlit UI のタブ断片2件（現行 `core` から除去済みの API を呼ぶ）。
- `setup/`: 旧セットアップ対 `setup_db.py` / `verify_setup.py`（`setup/README.md` 参照）。

## 禁止事項

- ここから現行コードへ import / 参照を追加しない。
- 仕様確認なしに旧コードを現行機能として復活させない。
- archived 機能（`is_judging`・counters・snapshot 等）を現行機能と誤認しない。

復旧元として使う場合は、挙動変更を混ぜない独立した設計・検証作業として扱ってください。判断観点は `archive/README.md` の「再利用前に確認すること」を参照。
