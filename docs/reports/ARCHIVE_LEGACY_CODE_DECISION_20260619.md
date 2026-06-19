# `archive/legacy-code/` 導入判断（2026-06-19）

## 判断段階の結論（2026-06-19）

**GO（条件付き・段階導入）** とする。

現行の Next.js + FastAPI 実装領域から候補14件への参照は0件であり、`archive/` 直下の旧コードを `archive/legacy-code/` に隔離することは、AIによる現行コードとの誤認防止に有効である。判断段階では本レポートの作成だけで停止し、物理移動は承認後の独立した構造整理として行う方針を確定した。

- Phase 1 の移動対象: `archive/` 直下の10件と `archive/unused_tabs/` の2件
- 現配置に残すもの: `archive/setup_db.py`、`archive/verify_setup.py`
- `archive/legacy-docs/`: **DEFER**。Markdown、`docs/archive/`、既存レポートは移動しない
- Public API、DBスキーマ、migration、TypeScript型、永続先、UI挙動: 変更しない
- 判断段階: ファイル移動、`CHANGELOG.md` 更新、コミット、Pull request作成、旧スクリプト実行、DBバックアップを行わない

## 基準状態

| 項目 | 基準 |
|---|---|
| ブランチ / commit | `main` / `394af7f` |
| tracked ファイル | 378件 |
| `archive/` 配下 | 59件 |
| `archive/` 直下の Python | 12件 |
| `archive/unused_tabs/` の Python | 2件 |
| `archive/` 直下の bat | 0件 |
| 作業開始時の tracked 差分 | なし |

この基準はローカルの Git 状態で取得した。network fetch は行っていない。

## 調査範囲と判定基準

現行領域は `api/`、`api_app.py`、`core/`、`frontend/`、`scripts/`、`tests/`、`config.py`、`run_dev.bat`、`run_api.bat` とした。候補のファイル名・モジュール名、および `from archive` / `import archive` を検索した結果、現行領域からの参照は0件だった。

移動可否は次の条件で判断した。

1. 現行実行経路から import・ファイル名参照されていない。
2. 移動後も旧 Streamlit UI の退避状態を壊さない。
3. 実行可能な旧コードを現行機能として復活させない。
4. 現行正本の参照更新を限定できる。
5. DB・設定・ファイルへ書き込める候補は実行せず、能力だけを静的に記録する。

## 候補14件の判定（移動前パス）

「docs参照」の正本は `docs/context/`、履歴は `CHANGELOG.md`、`docs/reports/`、`docs/archive/`、`archive/*.md` を指す。履歴資料の旧パスは時点資料として遡及修正しない。

| 候補（移動前） | 役割 | 現行参照 | docs参照区分 | archive内部の参照・依存 | 書き込み能力 | 判定 |
|---|---|---:|---|---|---|---|
| `archive/analysis_tab_v2.py` | Streamlit / Plotly の旧分析UI | 0 | 履歴資料・CHANGELOG | `core.app_service` の旧分析APIを呼ぶ。`Path(__file__).parent / "_theme_classic.css"` を参照するが、CSS実体は `archive/streamlit/ui/` にあり現状でも相対位置が不一致 | 直接書き込みなし | **移動可** |
| `archive/config_store.py` | `core.config_utils` の旧互換shim | 0 | 正本のarchive案内、履歴資料・CHANGELOG | 他の旧Pythonからの直接importなし | re-export先を通じて `user_config.json` を書き込み可能 | **移動可** |
| `archive/counter_service.py` | 廃止済み counters 機能 | 0 | 正本のarchive案内、履歴資料・CHANGELOG | `video_manager_methods.py` のコメント内に旧呼び出しあり | `counters` テーブルを更新可能 | **移動可** |
| `archive/create_test_data.py` | 旧テストデータ生成CLI | 0 | archive内資料・監査レポート | 直接参照なし | `videos` / `viewing_history` を削除・挿入可能 | **移動可** |
| `archive/detect_file_access.py` | 無効化済みアクセス検知断片 | 0 | 正本のarchive案内、履歴資料・CHANGELOG | 全実装がコメント。旧 `app_service` / `ui.cache` を記録 | 現状は実行不能。コメント上は履歴・設定を書き込み | **移動可** |
| `archive/history_repository.py` | `core.database.insert_play_history` の旧互換shim | 0 | 正本のarchive案内、履歴資料・CHANGELOG | 他の旧Pythonからの直接importなし | re-export先を通じて再生履歴を挿入可能 | **移動可** |
| `archive/inspect_database.py` | 旧DB検査CLI | 0 | archive内資料・監査レポート | 直接参照なし。archive内コードのため `sqlite3.connect()` 直呼びが残る | 読み取りのみ | **移動可** |
| `archive/settings.py` | 廃止済みアクセス検知設定 | 0 | 正本のarchive案内、履歴資料・CHANGELOG | 直接参照なし | `data/app_settings.json` を作成・更新可能 | **移動可** |
| `archive/snapshot.py` | 廃止済みDBスナップショット | 0 | 正本のarchive案内、履歴資料・CHANGELOG | `unused_tabs/extra_tabs_unused.py` が同名の旧 `app_service` APIを呼ぶが、現行 `core.app_service` にAPIはない | `data/snapshots/` にSQLiteファイルを作成可能 | **移動可** |
| `archive/video_manager_methods.py` | 無効化済み `VideoManager` メソッド断片 | 0 | 正本のarchive案内、履歴資料・CHANGELOG | 全実装がコメント。`counter_service` の旧呼び出しを記録 | 現状は実行不能。コメント上はDB更新・動画リネームを含む | **移動可** |
| `archive/setup_db.py` | 旧DB初期化CLI | 0 | 正本の構造資料、履歴資料 | 旧UIが `python archive/setup_db.py` を表示。完了案内から `verify_setup.py` を参照 | 既存DBを削除し再作成可能 | **残置** |
| `archive/verify_setup.py` | 旧セットアップ検証CLI | 0 | archive内資料・監査レポート | エラー案内から `setup_db.py` を参照 | DBは読み取りのみ | **残置** |
| `archive/unused_tabs/extra_tabs_unused.py` | counters / snapshot / settings の旧Streamlit UI | 0 | 監査レポート | 現行 `core.app_service` から除去済みの旧APIを複数呼ぶ | UI操作時の意図としてDB・設定・snapshotへ間接書き込み | **移動可** |
| `archive/unused_tabs/random_tab.py` | 旧ランダム再生UI | 0 | 監査レポート | 現行 `VideoManager` から除去済みの `get_random_video()` と再生callbackに依存 | callback経由で再生処理を起動し得る | **移動可** |

`verify_setup.py` の素のファイル名参照はパス非依存であり、単体では移動可能である。残置は技術的制約ではなく、旧UIがフルパスで参照する `setup_db.py` とセットアップ対としての凝集を維持するための編集判断である。

## 既知の復元リスク

次の問題は現配置ですでに存在し、現行実行経路には影響しないため、物理移動のブロッカーにはしない。ただし、archiveコードを復元する場合は別途修正が必要である。

- `analysis_tab_v2.py` の相対CSS参照先が実体配置と一致しない。
- `analysis_tab_v2.py` と `unused_tabs/extra_tabs_unused.py` は、現行 `core.app_service` から除去済みの旧APIを呼ぶ。
- `unused_tabs/random_tab.py` は、現行 `VideoManager` から除去済みの旧APIを呼ぶ。
- `video_manager_methods.py` と `detect_file_access.py` はコメント化された参照用断片であり、単体では動作しない。
- counters、`is_judging`、snapshot、`FILE_ACCESS_DETECTED`、`MANUAL_ENTRY` 等の記述は歴史資料であり、現行機能として復活させない。

## Phase 1 実施計画（判断段階）

判断段階では、承認後に物理移動だけを扱う独立ブランチ `chore/archive-legacy-code-phase1` を作成し、次の12件だけを `git mv` で `archive/legacy-code/` 配下へ移動する計画とした。

着手前に `docs/context/AI_WORKFLOW.md` §H に従い、`data/` の既存DBバックアップの有無を読み取りだけで確認し、確認結果をPull request本文に記載する。新規バックアップは、旧スクリプトを実行せず `git mv` とdocs更新だけを行い、`data/` を変更しないため省略する。この省略理由もPull request本文に明記する。DBへ触れるコマンドが必要になった場合は作業を停止し、バックアップ取得後に再開する。

```text
analysis_tab_v2.py
config_store.py
counter_service.py
create_test_data.py
detect_file_access.py
history_repository.py
inspect_database.py
settings.py
snapshot.py
video_manager_methods.py
unused_tabs/extra_tabs_unused.py
unused_tabs/random_tab.py
```

同じ変更で、現行パスを示す正本だけを新配置へ更新する。

- `archive/README.md`
- `docs/context/REPO_STRUCTURE.md`
- `docs/context/AI_WORKFLOW.md`
- `docs/context/GLOSSARY.md`
- `docs/context/IMPLEMENTATION_GUIDE.md`
- 本判断レポート（実施結果の追記）
- `CHANGELOG.md`（構造整理のみで挙動変更なしと記載）

次は変更しない。

- `archive/streamlit/`
- `archive/setup_db.py`、`archive/verify_setup.py`
- `archive/*.md`
- `archive/legacy-docs/` の作成
- `docs/context/PROJECT_OVERVIEW.md`
- 既存の `docs/reports/`、`docs/archive/`
- 過去の `CHANGELOG.md` 項目
- `core/`、`api/`、`frontend/`、`scripts/`、`tests/`
- `data/`、`artifacts/`、ignore済みローカルファイル・キャッシュ

`docs/context/PROJECT_OVERVIEW.md` には移動前パスが残る。これは同ファイルがStreamlit期の歴史資料であるための既知・許容事項であり、リンク先の現配置を示す正本には使用しない。

## 物理移動後の検証条件

1. 既存DBバックアップの確認結果と、新規バックアップを省略する理由がPull request本文に記載されている。
2. 現行領域の `archive` import と候補名参照が0件。
3. 更新対象の現行正本に、移動済みファイルの旧パスが残らない。
4. `archive/setup_db.py` への旧UI表示参照だけが意図的に残る。
5. `archive/streamlit/`、`data/`、`artifacts/`、実装領域に差分がない。
6. `git diff --check` が通る。
7. `python -m compileall api_app.py api core` が通る。
8. `python -m pytest` が通る。
9. `frontend/` で `npm run typecheck`、`npm run lint`、`npm run build` が通る。

runtimeスモークは実施しない。起動バッチがDBバックアップやmigrationを実行し、保護対象の `data/` を変更する可能性がある一方、今回の変更は現行実行経路に触れない構造整理だけだからである。未実施理由はPull request本文に明記する。

## 判断段階の停止位置

本レポート作成時点では判断だけを確定し、物理移動には着手しなかった。旧スクリプトを一切実行せず、`data/` を変更しないことで安全を担保した。DBバックアップは、docs-onlyの判断段階では作成しなかった。

## Phase 1 実施結果（2026-06-20）

Pull request #53 で確定した判断に基づき、`main` の `5eaf1d9` から `chore/archive-legacy-code-phase1` を作成し、次の12件を内容無変更の `git mv` で移動した。

| 移動前 | 移動後 |
|---|---|
| `archive/analysis_tab_v2.py` | `archive/legacy-code/analysis_tab_v2.py` |
| `archive/config_store.py` | `archive/legacy-code/config_store.py` |
| `archive/counter_service.py` | `archive/legacy-code/counter_service.py` |
| `archive/create_test_data.py` | `archive/legacy-code/create_test_data.py` |
| `archive/detect_file_access.py` | `archive/legacy-code/detect_file_access.py` |
| `archive/history_repository.py` | `archive/legacy-code/history_repository.py` |
| `archive/inspect_database.py` | `archive/legacy-code/inspect_database.py` |
| `archive/settings.py` | `archive/legacy-code/settings.py` |
| `archive/snapshot.py` | `archive/legacy-code/snapshot.py` |
| `archive/video_manager_methods.py` | `archive/legacy-code/video_manager_methods.py` |
| `archive/unused_tabs/extra_tabs_unused.py` | `archive/legacy-code/unused_tabs/extra_tabs_unused.py` |
| `archive/unused_tabs/random_tab.py` | `archive/legacy-code/unused_tabs/random_tab.py` |

- `archive/setup_db.py` と `archive/verify_setup.py` は旧セットアップ対として残置した。
- `archive/streamlit/` は別枠の旧 UI として変更せず、`archive/legacy-docs/` は導入しなかった。
- 作業開始前に `data/backups/` をファイル名・DB内容を取得せず読み取り、DBバックアップ20件、最新更新日時 2026-06-18 00:13:11、最新サイズ 6,209,536 bytes を確認した。
- 旧スクリプト、起動バッチ、migrationを実行せず、DBを開かず、`data/` を変更しないため、新規バックアップは省略した。DBを開く必要が生じた場合は停止する条件を維持した。
- Public API、DBスキーマ、migration、TypeScript型、永続先、UI挙動、現行実装には変更を加えていない。

### ローカル検証結果

| 確認 | 結果 |
|---|---|
| `git diff --summary` | 12件すべて100% rename、旧 Python の内容変更なし |
| 保護対象の差分確認 | `archive/streamlit/`、setup/verify、`core/`、`api/`、`frontend/`、`scripts/`、`tests/` に差分なし |
| 現行領域の archive import | 0件 |
| 現行正本と `archive/README.md` の移動前パス | 0件 |
| `git diff --check` | 成功 |
| `python -m compileall api_app.py api core` | 成功 |
| `python -m pytest` | 161件成功 |
| `npm run typecheck` | 成功 |
| `npm run lint` | 成功 |
| `npm run build` | 成功 |
| `python scripts/check_notebook_outputs.py` | 今回未変更かつgit-ignoredのローカル notebook 3件に既存outputsがあり失敗。対象はすべてuntrackedで、`--staged` 検査は成功 |

runtimeスモーク、起動バッチ、migration、旧スクリプト、UI手動確認は実施していない。今回の変更が archived コードの物理移動とdocs更新だけで、現行実行経路に触れず、起動バッチによるDBバックアップやmigrationで `data/` を変更しないためである。
