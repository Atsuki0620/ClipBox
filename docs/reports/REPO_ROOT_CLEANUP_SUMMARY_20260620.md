# リポジトリルート構成整理 完了サマリ（2026-06-20）

プロジェクトルートと `archive/` / `docs/` の構成整理を完了させた記録。目的は、初見の Coding Agent が歴史資料を現行正本と誤認しないよう、現行（Next.js + FastAPI）と歴史資料の境界を構造で明確にすること。

本サマリは時点の記録であり、現行仕様の正本ではない。現行仕様は `docs/context/`（入口 `OVERVIEW.md`、台帳 `AGENTS.md`）を参照する。

## 一連の整理の全体像

| 時期 | 内容 | 記録 |
|---|---|---|
| Phase 5（2026-06-17） | 旧 Streamlit UI を `archive/streamlit/` へ退避し導線を一本化 | `docs/context/PHASE5_STREAMLIT_ARCHIVE.md`、`PHASE5_STREAMLIT_ARCHIVE_PREP_20260616.md` |
| 2026-06-19 | `archive/` 参照監査・移動判断（GO） | `ARCHIVE_REFERENCE_AUDIT_20260619.md`、`ARCHIVE_LEGACY_CODE_DECISION_20260619.md` |
| 2026-06-20 | 旧 Python コード12件を `archive/legacy-code/` へ隔離（Phase 1 実施） | 同上レポート「Phase 1 実施結果」 |
| 2026-06-20 | 分析資料を `docs/analysis/` に集約、開発依存を `requirements/` へ | `CHANGELOG.md` |
| 2026-06-20（本作業） | 構成整理の最終化（下記） | 本サマリ |

## 本作業（最終化）で実施したこと

1. **`archive/legacy-docs/` 導入** — `archive/` 直下にあった Streamlit 期の旧設計・旧実装メモ（Markdown 23件）を `archive/legacy-docs/` へ `git mv`。`archive/legacy-docs/README.md` を新設し、収録資料を分類。
2. **旧セットアップ対の集約** — `archive/setup_db.py` / `archive/verify_setup.py` を `archive/legacy-code/setup/` へ `git mv`。`archive/legacy-code/setup/README.md`（実行禁止注記つき）と `archive/legacy-code/README.md` を新設。
3. **Streamlit 期概要の退避** — `docs/context/PROJECT_OVERVIEW.md` を `docs/archive/PROJECT_OVERVIEW_STREAMLIT.md` へ `git mv`。`docs/context/` を現行正本だけの場所にした。
4. **`docs/reports/README.md` 追加** — レポートの分類・命名規則・主要入口を整理。
5. **完了サマリ追加** — 本ファイル。
6. **参照更新** — 現行正本のみ更新（`AGENTS.md`、`CLAUDE.md`、`docs/context/OVERVIEW.md`、`docs/context/REPO_STRUCTURE.md`、`docs/context/IMPLEMENTATION_GUIDE.md`、`docs/context/PHASE5_STREAMLIT_ARCHIVE.md`、`archive/README.md`、`docs/archive/README.md`、`docs/archive/PROJECT_OVERVIEW_STREAMLIT.md` のバナー内リンク）。`CHANGELOG.md` に要約を追記。

## 整理後の到達点（主要構成）

```
archive/
├── README.md                       # archive 全体の扱い・禁止事項
├── legacy-code/                    # 隔離した旧コード断片
│   ├── README.md
│   ├── setup/                      # 旧セットアップ対（実行しない）
│   │   ├── README.md
│   │   ├── setup_db.py
│   │   └── verify_setup.py
│   └── unused_tabs/
├── legacy-docs/                    # 旧設計・旧実装メモ（Markdown）
│   ├── README.md
│   └── ...
└── streamlit/                      # 旧 Streamlit UI（Phase 5 退避・別枠）

docs/
├── context/                        # 現行正本のみ
├── archive/                        # 歴史資料
│   ├── README.md
│   ├── MIGRATION_PLAN.md / MIGRATION_MAP.md
│   └── PROJECT_OVERVIEW_STREAMLIT.md
├── reports/                        # 日付付きレポート（README.md で読み方を整理）
└── analysis/                       # 分析資料
```

`archive/` 直下に残るのは `README.md` のみで、コード・旧 UI・旧メモはすべてサブディレクトリに分類済み。

## 残したもの（意図的）

- `archive/streamlit/` — 旧 Streamlit UI の退避先。別枠として移動・削除しない。
- 旧 Streamlit UI（`archive/streamlit/streamlit_app.py`）の DB 未検出時の案内表示は、現在のパス `python archive/legacy-code/setup/setup_db.py` へ補正済み。あわせて「通常導線では使わない／実行前にバックアップと目的確認が必須」の注意を表示する。旧 UI は通常起動しない。
- 過去レポート・過去 `CHANGELOG.md` 項目・歴史資料内の当時のパス表記。時点資料として遡及修正しない。

## 変更しなかったもの

- `core/`・`api/`・`frontend/`・`scripts/`・`tests/`・`config.py`・現行実装。
- DB スキーマ・migration・Public API・TypeScript 型・localStorage キー・UI 挙動・ランキング式。
- `data/`・`artifacts/`・DB ファイル・動画ファイル・個人設定ファイル。

## 今後やる場合は別テーマに分けること

- ランキング公平化分析、UI 改修、新機能追加は本整理のスコープ外。別 Pull request で扱う。
- archived コードを復旧元として使う場合は、挙動変更を混ぜない独立した設計・検証作業として扱う（`archive/README.md` の確認観点を参照）。
