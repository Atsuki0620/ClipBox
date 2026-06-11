# TESTING — 品質ゲート・回帰確認の正本

対象読者: Coding agent（Claude Code / Codex）、レビュアー。
位置づけ: **「どの変更で何を確認するか」「PR に何を書くか」の正本**。手順全体の入口は `AI_WORKFLOW.md`、画面・状態の意味は `SPEC_NEXTJS.md`、フル手動基準は `ACCEPTANCE_CRITERIA.md`。本書はそれらを束ねる品質ゲートの索引。

> 方針: テストを増やすこと自体は目的ではない。**安定利用と AI 作業精度**に効くものを優先し、既存で足りる部分は手順の明文化で担保する。

---

## 1. 現状のテスト・チェック体制（カバレッジ）

### Backend（pytest — 既に手厚い）
- 実行: `python -m pytest`（`tests/` を自動検出。pytest 設定ファイルは無いがデフォルトで動作）。依存は `requirements.txt`（`pytest` / `pytest-cov` / `httpx`）。
- フィクスチャ: `tests/conftest.py:tmp_db`（`init_database()` でスキーマ＋migration 適用）、`tests/api/conftest.py:client`（FastAPI TestClient ＋ config/backup/scan を tmp に隔離）。アプリは `api_app.py:create_app()` ファクトリ、DB は `core.database.DATABASE_PATH` を monkeypatch で差し替え。

| 領域 | カバー | 主なテスト |
|---|---|---|
| API 全ルート（TestClient） | ✅ | `tests/api/test_{videos,videos_read,actions,watch_later,likes,avp,stats,analysis,admin,runtime,health}.py` |
| DB migration | ✅ | `test_migration.py`（level 0→-1 / resync_selection_completed / idempotent） |
| viewing_history 記録 | ✅ | `test_actions.py:test_play_success_records_history`, `test_avp.py` |
| judgment_history 記録 | ✅ | `test_video_manager.py`, `test_actions.py:test_set_level_success_renames_and_logs` |
| watch_later トグル＋**自動解除** | ✅ | `test_watch_later.py:test_watch_later_auto_cleared_on_level_set`, `test_video_manager.py:test_selection_judgment_syncs_column_and_clears_watch_later` |
| AVP 再生履歴（APP_PLAYBACK） | ✅ | `test_avp.py:test_avp_play_success_records_view_history` |
| プレフィックス解析 | ✅ | `test_scanner.py:test_extract_essential_filename_*` |
| backup / startup_backup | ✅ | `test_backup.py` |
| runtime 制御 | ✅ | `test_runtime.py`, `test_runtime_control.py` |
| **総合（composite）スコア式** | ✅（2026-06 追加） | `test_stats.py:test_ranking_composite_*`（正確値 900 / score0 除外 / T1・T2 ボーナス順） |

### Frontend
- `cd frontend && npm run typecheck`（= `tsc --noEmit`、`tsconfig` strict）/ `npm run lint`（eslint: next/core-web-vitals + typescript）。`next build` も型チェックを実行する。
- **自動テストランナーは無い**（Jest/Vitest 未導入）。方針により追加しない。型チェック＋lint＋手動スモークで担保する。`npm test` は存在しない（提案しない）。

### Runtime
- `run_dev.bat` / `run_api.bat`: `startup_backup.py` → `run_migrations.py` → uvicorn の順。
- `scripts/run_migrations.py`: API 稼働（`/api/health`）を検知して書き込みをスキップ。DB 未作成時は `init_database()` を実行。
- `scripts/startup_backup.py`: 当日1回・最新10件保持で `data/` にバックアップ。

---

## 2. 最低限の品質ゲート（変更種別 → 必須）

| 変更種別 | 必須 |
|---|---|
| **どの変更でも** | 変更ファイルを Read 済み / 関連 docs と矛盾なし / `CHANGELOG.md` に追記 |
| **backend `core/` / `api/`** | `python -m pytest`（全緑）。API I/O を変えたら `API_SPEC.md` を同一 PR で整合 |
| **DB スキーマ / migration** | `python -m pytest`（特に `test_migration.py`）/ `DATA_MODEL.md` 更新 / **DB バックアップ前提** / `scripts/run_migrations.py` を「API 停止状態」で実行確認 / archived 列（`is_judging`/`counters`）を誤復活させない |
| **frontend** | `npm run typecheck` ＋ `npm run lint`（両方通過）/ `SPEC_NEXTJS.md` §0 の永続境界（DB↔localStorage）を移動しない / §3 の該当スモーク |
| **起動バッチ / scripts** | 起動 → `/api/health` 200 → `/` 表示 を実機確認 / `startup_backup` が `data/` にバックアップ生成 / DB 未作成時に `init_database()` で作成される |

---

## 3. 手動確認チェックリスト（3層・該当領域のみ）

フル基準は `ACCEPTANCE_CRITERIA.md`。ここは回帰確認の粒度を決めるための層分け。

### 5分（最低限・happy path）
```markdown
- [ ] 起動: FastAPI(8000)+Next.js(3000) が起動し / が表示される
- [ ] Tier1: 一覧表示 → レベル判定 → 「未判定」フィルタから消える
- [ ] ランキング: 総合スコア降順で表示され、score 0 が出ない
```

### 15分（標準）
```markdown
- [ ] 5分版すべて
- [ ] Tier2: フォルダ選択 → `!` 未選別表示 → 選別完了で「選別済み」表示
- [ ] AVP: 候補追加(上限なし) → 再生対象は最大4本 → 再生中ハイライト表示
- [ ] あとで見る: トグル保存 → 判定/選別完了で自動解除 → 再生では解除されない
- [ ] 分析: 各グラフ(Recharts)がエラーなく描画される
- [ ] 設定: 設定保存 → スキャン → バックアップ実行
```

### 大型PR後
```markdown
- [ ] 15分版すべて
- [ ] ACCEPTANCE_CRITERIA.md の該当セクションを全消化
- [ ] python -m pytest 全緑
- [ ] frontend: npm run typecheck ＋ npm run lint 通過
- [ ] DB 変更時: バックアップからの復元を確認
```

---

## 4. 自動テスト追加候補（優先度）

- **High（対応済み）**: 総合スコア式（`test_stats.py:test_ranking_composite_*`）。SPEC §9 の係数・score0除外・ボーナス順を固定。
- **Medium（任意・後日）**: judged_at ソートのタイブレーカー（一部 `test_videos.py:test_list_videos_sort_judged_at_tail_stable` で担保済み）、セレクション scan-add 時の `needs_selection` 設定。
- **後回し**: frontend のコンポーネント/ストアの自動テスト基盤（Jest/Vitest）、E2E（Playwright 等）。現方針では導入しない。

---

## 5. 実際に使うコマンド（存在確認済み）

```bash
python -m pytest                      # backend 全テスト
python -m pytest tests/api            # API のみ（個別は python -m pytest tests/test_migration.py 等）
cd frontend && npm run typecheck      # = tsc --noEmit（strict）
cd frontend && npm run lint           # = eslint
run_dev.bat                           # startup_backup → run_migrations → FastAPI(8000)+Next.js(3000)
run_api.bat                           # API のみ（前処理つき）
python scripts\run_migrations.py      # migration 単体（API 稼働中は read-only チェック）
python scripts\startup_backup.py      # 起動時 DB バックアップ（当日1回・最新10保持）
```
> frontend に test スクリプトは無い。`npm test` は使わない。

---

## 6. AI 作業時の完了条件（PR 本文に書く）

`.github/PULL_REQUEST_TEMPLATE.md` に沿い、最低限:
- **テスト結果**: 実行したコマンドと結果を**コピペ**（例: `python -m pytest` → `123 passed`）。回した範囲を明記。
- **手動確認結果**: §3 のどの層（5分/15分/大型）を、どの画面で確認したかを列挙。実機 OS／プレイヤー条件は必要なら付記。
- **未確認の明記**: 確認していない項目は「未確認: 〜（理由: 実機 AVP.exe 不在 等）」と**明示的に書く**。沈黙で省略しない。
- **不変条件**: `AGENTS.md` 末尾の禁止事項 / `SPEC_NEXTJS.md` §12 に抵触しないことを確認。
