# CHANGELOG

AIへの引き継ぎノート。主要な変更を遡及記録。

---

## 2026-06-10 — feat: PR5 — あとで見る（watch_later）

**バックエンド**:
- **`core/video_manager.py`**: `toggle_watch_later(video_id)` 追加。`watch_later` フラグを
  反転して新値（`bool`）を返す。動画不在は `KeyError`。
- **`core/app_service.py`**: `toggle_watch_later` ファサード追加。
- **`api/schemas.py`**: `VideoOut` に `watch_later: bool` 追加（`from_video` で評価）。
  `WatchLaterResponse(status, message, watch_later)` 追加。
- **`api/actions.py`**: `POST /videos/{id}/watch-later/toggle` エンドポイント追加。
  `_ensure_exists` で存在確認 → `app_service.toggle_watch_later` 呼び出し。
- **`api/videos.py`**: `GET /videos` に `watch_later: Optional[bool]` フィルタ追加。
- **`tests/api/test_watch_later.py`**: 新規テスト 5件。トグル on/off・404・絞り込み・
  判定変更時の自動解除（回帰）。

**フロントエンド**:
- **`frontend/src/lib/types.ts`**: `Video.watch_later: boolean`、`VideoListParams.watch_later?`、
  `WatchLaterResponse` インターフェース追加。
- **`frontend/src/lib/api.ts`**: `toggleWatchLater(id)` 関数追加。`WatchLaterResponse` import追加。
- **`frontend/src/lib/store.ts`**: `LibraryFilters.watchLater?: boolean` 追加。
  `DEFAULTS.watchLater: undefined` 追加。
- **`frontend/src/components/VideoCard.tsx`**: Bookmark トグルボタン追加（`watchLaterM`
  mutation + `onSettled: invalidate`）。`watch_later` が `true` のとき `variant="default"`。
- **`frontend/src/components/LibraryFilterBar.tsx`**: `watchLater` props + `onWatchLaterChange`
  コールバック + Bookmark ボタン追加。
- **`frontend/src/components/FilterPanel.tsx`**: `watchLater` / `onWatchLaterChange` を store に配線。
- **`frontend/src/app/page.tsx`**: `params` の `useMemo` に `watch_later: store.watchLater` 追加。

**検証**: pytest 139件全件緑 / tsc 0 errors / eslint 0 warnings。

---

## 2026-06-10 — feat: PR3 + PR4（AVP ページ再設計 + AVP 再生履歴記録）

承認済み計画の **PR3**（AVP ページ再設計）と **PR4**（AVP 再生後の視聴履歴記録）。

**PR3 — AvpStore 刷新 + AVP ページ再設計**:
- **`frontend/src/lib/store.ts`**: `useAvpStore` を全面刷新。旧 `avpSelectedIds`(≤4) /
  `avpLaunchSelectedIds` / `avpPlayingIds` を廃止し、`avpCandidateIds`（候補・上限なし）/
  `avpPlayTargetIds`（再生対象・≤4）に変更。`zustand/middleware` の persist（key `clipbox-avp`）
  でリロードを越えて永続化。`pruneIds(missingIds)` で欠損ID を両リストから一括除去。
  `MAX_AVP_SELECTION` を廃止し `MAX_AVP_PLAY_TARGET = 4` に統一。
- **`frontend/src/components/VideoCard.tsx`**: `avpSelectedIds` → `avpCandidateIds`、
  `toggleAvpSelectedId` → `toggleAvpCandidateId`、上限ガード（`avpMaxReached`）を撤去。
  ラベル「AVP選択」→「AVP候補」。候補は利用不可のみ disabled。
- **`frontend/src/components/SidebarNav.tsx`**: バッジカウントを `avpCandidateIds.length` に更新。
- **`frontend/src/app/avp/page.tsx`**: 全面改修。`useQueries`（N+1）廃止 → `useQuery + getVideosByIds`
  一括取得（staleTime 30 s）。`useEffect` で `missing_ids` を `pruneIds` に渡して自動掃除。
  2セクション構成（選択済み / 評価待ち）→ 単一候補カード一覧に統一。再生対象チェックボックスが
  4本上限で disabled + ツールチップ表示。再生成功後は `setAvpPlaying`（ハイライト更新）+
  `clearAvpPlayTargetIds`（再生対象リセット）。

**PR4 — AVP 再生後の視聴履歴記録**:
- **`core/app_service.py`**: `record_avp_viewing(video_ids)` 追加。AVP 再生後に
  `viewing_history` へ全 ID 一括 `executemany` で 1 トランザクション記録。
- **`api/avp.py`**: `subprocess.Popen` 成功後に `app_service.record_avp_viewing(video_ids)` を呼び出し。
  設計コメントを「viewing_history を記録する」に更新。
- **`tests/api/test_avp.py`**: `test_avp_play_success_records_view_history` に改名・期待値反転
  （`count == 0` → `count == len(ids)`）。

**検証**: pytest 134件全件緑 / tsc 0 errors / eslint 0 warnings。

---

## 2026-06-10 — fix: PR #31 レビュー対応（by-ids チャンク取得 + テスト追加）

PR #31 のレビュー指摘に対する修正。

**変更点**:
- **チャンク取得** (`core/video_manager.py`): `get_videos_by_ids` を SQLite のバインド変数上限
  （デフォルト 999）に対応するため `_SQLITE_VAR_LIMIT=900` 件ずつ IN 句をチャンク分割して取得する
  方式に変更。重複IDは先頭の出現のみ返す（`dict.fromkeys` で dedup・入力順維持）。
  API 層の `missing_ids` 算出は元の `dict.fromkeys` ロジックを維持。
- **テスト追加** (`tests/api/test_videos.py`):
  - `test_get_videos_by_ids_large_batch`: 1000件超（SQLite 上限を超える）でもエラーなし・
    入力順保持・missing_ids 正確に返る。
  - `test_get_videos_by_ids_duplicate_ids`: 重複IDは items 1件・missing_ids も重複除去されて
    1件であることを明示。

**TODO（次PR以降）**: `watch_later` はこの PR で DB カラム・`core.models.Video` フィールド・
`get_videos(watch_later_filter=...)` まで基盤を整えた。`VideoOut.watch_later` の公開・
`PUT /api/videos/{id}/watch-later` エンドポイント・フロント UI（VideoCard トグル / フィルタ）は
**PR5 で実装予定**（承認済み計画参照）。

**検証**: pytest 全件緑（後述）。

---

## 2026-06-09 — feat: Next.js版改善 PR2（再生中ハイライト）

承認済み計画の **PR2**。単体=1本 / AVP=最大4本の「再生中」をカードでハイライトする。

**変更点**:
- **永続ストア** (`frontend/src/lib/store.ts`): `usePlaybackStore`（`zustand/middleware` の persist、
  key `clipbox-playback`）。`singlePlayingId` / `avpPlayingIds`(≤4) と `setSinglePlaying`（avp クリア）/
  `setAvpPlaying`（single クリア・最大4）。次の再生でID置換。タブ移動・リロードを越えて保持。
- **ハイドレーション安全** (`useIsPlaying` / `useHydrated`): `useSyncExternalStore` で SSR と初回
  クライアントレンダリングは false、以降 localStorage 由来を反映（不整合・setState-in-effect 回避）。
- **R4 共通フック** (`frontend/src/lib/usePlayVideo.ts` 新規): 再生成功で `setSinglePlaying(id)`、
  共通キー（kpi/likes/view-counts）+ 画面別 invalidateKeys を無効化。**VideoCard・運命の1本
  （app/page.tsx / app/tier2/page.tsx の playVideo 直呼び）の全経路**で使用し配線漏れを防ぐ。
- **VideoCard**: 旧 AVP 選択リング（`ring-2 ring-primary`）を撤去し、`isPlaying` で
  `border-2 border-amber-400 bg-amber-50`（薄背景・色付き太枠）。再生は usePlayVideo 経由。
- **AVPページ**: 起動成功で `setAvpPlaying(ids)` も呼び、AVP 再生中（最大4本）をハイライト。

**検証**: フロント `tsc --noEmit` / `eslint` 緑。pytest 132件緑（バックエンド非変更）。
手動確認（再生中ハイライト・タブ/リロード保持・次の再生で置換）は別途。

---

## 2026-06-09 — feat: Next.js版改善 PR1（バッチ取得 + 判定日時ソート）

承認済み計画の **PR1**。独立・低リスクの API/フロント拡張。

**変更点**:
- **R1/R9 バッチ取得** (`POST /api/videos/by-ids`): `{ ids }` → `{ items, missing_ids }`。
  items は入力順保持・削除済み含む。見つからないIDは missing_ids（クライアントの localStorage 候補掃除用）。
  `app_service.get_videos_by_ids` をラップ。`/videos/{video_id}` より前に定義（パス解決順）。
- **判定日時ソート**: `GET /api/videos`・`/videos/selection` の `sort` を `modified`→`judged_at` に置換。
  `core.database.get_latest_judged_at_map(conn, selection)` を新設（Tier1=`was_selection_judgment=0` /
  Tier2=`=1` の最新 judged_at、`is_deleted=0` 尊重）。`_apply_sort` は partition 方式で
  **未判定（判定履歴なし）を asc/desc とも末尾固定**。
- フロント: `types.ts`（`SortField` modified→judged_at、`VideosByIdsResponse` 追加）/
  `api.ts`（`getVideosByIds`、空配列は無通信）/ `LibraryFilterBar`（「更新日」→「判定日時」）。
- `API_SPEC.md` 更新。

**検証**: pytest 132件緑（by-ids 順序保持/missing、judged_at 末尾安定、Tier別マップの追加テスト）。
フロント `tsc --noEmit` / `eslint` 緑。

---

## 2026-06-09 — feat: Next.js版改善 PR0（R5/R6 基盤修正 + スキーマ移行基盤）

Next.js版7改善の承認済み計画（`docs/...` / 計画ファイル）の **PR0**。他PRの前提となる core 正当性の是正と、
Next.js スタックに欠けていたスキーマ移行経路を新設する。**UI 変更なし**。

**背景**: `run_dev.bat` は Streamlit を起動せず、`api_app.py` の lifespan は read-only。よって
`init_database()` / `run_startup_migration()`（従来 Streamlit が担っていた）を流す経路が無く、
新フロントが前提とする列を用意できなかった。加えて `is_selection_completed` 列が陳腐化していた。

**変更点**:
- **R5 選別済み列の書込同期** (`core/video_manager.py`): `set_favorite_level_with_rename` の UPDATE で
  `is_selection_completed` を + プレフィックス有無に同期。あわせて判定済み(level≥0)/選別完了(+付与)時に
  `watch_later` を自動解除（同一トランザクション）。
- **R6 既存分の冪等再同期** (`core/migration.py`): `resync_selection_completed`（id `resync_selection_completed_20260609`）。
  全 videos の + 有無で列を再計算。`app_service.run_startup_migration()` から `migrate_level_0_to_minus_1` と共に実行。
- **R2 watch_later カラム** (`core/database.py`): `init_database()` の PRAGMA ガード付き ALTER に追記
  （CREATE TABLE 定義 + 部分インデックス `idx_videos_watch_later`）。列はログ式で別管理しない。
- **R8 watch_later の波及** (`core/models.py`, `core/video_manager.py`, `core/analysis_service.py`, `core/app_service.py`):
  `Video` に実フィールド `watch_later` を追加し、`video_from_row` / `_df_row_to_video` で投入。
  `get_videos(watch_later_filter=...)` フィルタ引数を追加。
- **R3/R7 移行ランナー** (`scripts/run_migrations.py` 新規): `GET /api/health` で稼働検知。
  未稼働=書込移行を実行 / 稼働中=read-only 確認（**必要列 + 未完了データ補正の両方**が揃えば exit 0、
  どちらか未充足なら exit≠0 で「API停止して再実行」を促す）。列だけ見るとデータ補正
  （`resync_selection_completed`）の未実行を見逃すため、`migration` の ledger（`core.migration.DATA_MIGRATION_IDS`）も
  確認する。`run_dev.bat` / `run_api.bat` を `startup_backup.py` 直後・uvicorn 起動の前に配線
  （純ASCII維持。run_dev は移行失敗で中断）。

**検証**: 既存 + 追加 pytest 全 128 件緑。実DBのコピー（4,083行）に移行を適用 →
watch_later 列追加・行数不変・+動画の is_selection_completed 不整合 2件→0件（R6）・再実行は skip の no-op を確認。

**次PR**: PR1（`POST /videos/by-ids` + 判定日時ソート）以降は別途。

---

## 2026-06-08 — fix: run_dev.bat / run_api.bat の文字コード問題で Next.js が起動しない不具合

**症状**: `run_dev.bat` をダブルクリックしても `http://localhost:3000/` に Web アプリが出ない。
API(8000)は起動するが Next.js(3000)が立ち上がらない。

**原因**: 両 .bat が **BOM なし UTF-8** で日本語コメントを含んでいた。ダブルクリックで開く cmd.exe は
システム OEM コードページ **932 (Shift-JIS)** でバッチを読むため、UTF-8 の日本語バイト列を誤読し、
後続行のパースが崩れる。これにより `start "" /D "%FRONTEND%" npm.cmd run dev` の経路が壊れ、
npm が誤った作業ディレクトリ等で失敗して node プロセスが起動しなかった。
（`chcp 65001` を冒頭に置いても、cmd の**バッチパーサ**はこれだけでは UTF-8 マルチバイトを安定して扱えない。）

**切り分け**: 英語コメントのみのプローブ bat では Next.js が起動、日本語コメント入りプローブでは
`set` 行すら誤認し日本語が「コマンド」として実行された → 日本語コメントが原因と特定。

**対応**: `run_dev.bat` / `run_api.bat` の日本語コメントを英語化し、**ファイル全体を純 ASCII**に。
（`run_clipbox.bat` は元から ASCII のため変更なし。）修正後 `run_dev.bat` 実行で
API/Next.js とも起動・`localhost:3000` が HTTP 200 を返すことを確認。

**今後の注意**: cmd.exe 用 .bat は非 ASCII を入れない（英語コメント）こと。日本語を残すなら
Shift-JIS(CP932) 保存か UTF-8 **BOM 付き**で保存する必要がある。AI/エディタの既定保存(UTF-8 no-BOM)では壊れる。

---

## 2026-06-07 — PR #30 レビュー対応（Runtime 安全化 / analysis 集計化 / performers 廃止 ほか）

**目的**: PR #30 への Request changes レビュー（マージ前チェックリスト）を解消する。

**1. Runtime stop を ClipBox プロセスに限定**（`core/runtime_control.py`, `api_app.py`, `api/runtime.py`, `run_dev.bat`,
`frontend/src/components/SidebarNav.tsx`）
- 停止対象を **cwd がリポジトリ配下 AND cmdline にサービス固有マーカー**を満たすプロセスに限定（無差別停止を排除）。
  `uvicorn --reload` 対策として listener PID から祖先を辿り service root を特定しツリー停止。
- ClipBox と確認できないポート占有は `status="blocked"` → API は **409**。フロントは確認ダイアログで明示。
- Runtime API は **`create_app()` ファクトリ + `CLIPBOX_ENABLE_RUNTIME_CONTROL=1`** のときのみ公開（既定は無効・404）。
  `run_dev.bat` が dev 一括起動時に有効化。フロントは 404 を「無効」として lamp/停止パネルを非表示。
- **UI 統合**: FastAPI は API 実行主体のため、停止ボタンは「Streamlit」「Web/API」の2系統に集約。
  Web/API は `POST /api/runtime/web-stack/stop`（Next.js→FastAPI 順）。応答を待たず `about:blank` へ遷移。

**2. /analysis をサーバー SQL 集計へ**（`core/analysis_service.py`, `api/analysis.py`, `api/schemas.py`,
`frontend/src/lib/{api,types}.ts`, `frontend/src/app/analysis/page.tsx`）
- `GET /api/analysis/{viewing,judgment}-trend?bucket=day|week|month` を追加。viewing/judgment × videos を JOIN した
  SQL 集計で **video_ids を HTTP に乗せない**（旧 chunked GET による URL 長超過・リクエスト爆発を解消）。
  判定トレンドはバケットごとに `COUNT(DISTINCT video_id)`。週ラベルは月曜開始日で既存 selection-trend と統一。

**3. performers フィルタ廃止**（`api/videos.py`, `core/{app_service,video_manager}.py`, `api/schemas.py`,
`frontend/src/lib/types.ts`）
- フォルダ名由来の暫定抽出でフィルタに使えていなかった performers を API/core/`filter-options`/型から削除。
  DB カラム `performer` と `extract_performer` はレガシーとして据え置き（migration なし）。

**4. Tier1 のセレクション非表示を全モードへ + 判定状態フィルタ**（`core/video_manager.py`,
`frontend/src/lib/store.ts`, `frontend/src/components/FilterPanel.tsx`, `frontend/src/app/page.tsx`）
- `get_unrated_random_videos()` に `needs_selection=0 AND is_selection_completed=0` を追加し、ランダム/運命の1本でも
  セレクション関連(`!`/`+`)を出さない（Tier1=判定層を仕様化）。
- Tier1 に「すべて/未判定/判定済み」status を追加（levels へ写像。judged は既存 level 選択と intersection）。

**5. ライブラリスキャン前バックアップを必須化**（`core/app_service.py`, `api/admin.py`,
`frontend/src/app/settings/page.tsx`）
- `POST /api/scan/library` は直近24時間以内のバックアップが無ければ **409**（API 直叩き対策。`has_recent_backup()`）。
- 設定画面は実バックアップ（セッション内作成）のみで実行許可。自己申告チェックは廃止し、ダイアログに「今すぐバックアップ」を配置。

**6. AVP 複数ファイル起動の手動確認**: `docs/context/ACCEPTANCE_CRITERIA.md` に手動マトリクスを追記（実機確認は別途）。

**テスト**: `pytest tests/` **121 passed**（runtime 検証/--reload/web-stack、analysis trend の週 distinct、
unrated の selection 除外、scan 前バックアップ 409 ほかを追加）。frontend `tsc`/`lint`/`build` 通過。

---

## 2026-06-07 — バグ修正: ライブラリスキャンが selection_folder 動画を is_available=0 にする問題

**原因**: 通常のライブラリスキャン（`scan_and_update`）が自分のスキャン対象外の全動画を
`is_available=0` に落とす仕様のため、`selection_folder` 配下の動画が library_roots に含まれていない場合に
Tier2 動画が消えていた。

**対策**（`core/scanner.py`, `core/file_ops.py`, `core/app_service.py`）:

- `FileScanner` に `protected_roots` 引数を追加。`scan_and_update` は保護パス配下のレコードを
  `is_available=0` 更新の対象外とする（`_is_protected_path` でパス比較、`normcase(normpath(resolve()))` 使用）。
- `app_service.scan_library()` を2フェーズ構成に変更:
  - Phase 1: `library_roots` をスキャン（`selection_folder` を `protected_roots` に指定）
  - Phase 2: `selection_service.scan_selection_folder()` で selection フォルダを個別同期
- `scan_single_directory()` を `FileScanner` に追加。`selection_folder` 専用スキャン用で、
  対象ディレクトリ内のレコードのみ `is_available` を変更する。

**テスト追加**（`tests/test_scanner.py`）:
- `test_scan_keeps_protected_root_records_available`
- `test_scan_single_directory_marks_missing_files_in_that_directory_unavailable`

**残留リスク（軽微）**:
- `current_full_path` が stale な場合、Phase 1 直後は一時的に unavailable になりうるが
  Phase 2 完了時点で正しい状態に収束する。
- `selection_folder` が `library_roots` 配下にある場合は二重スキャンになるが冪等で実害なし。
  設定時に「library_roots の外に置くことを推奨」と案内することが望ましい。

---

## 2026-06-07 — ドキュメント: Phase 5 着手前チェックリスト追記

**目的**: Streamlit アーカイブ前に完了すべき事項を `docs/context/MIGRATION_PLAN.md` に整理・記録。

**関連ファイル**: `docs/context/MIGRATION_PLAN.md`

追記した主な項目:
- **A. コミット積み上げ**: `frontend/src/app/analysis/`, `avp/`, `settings/`、新コンポーネント群、
  `api/avp.py`, `api/runtime.py`, `core/runtime_control.py` 等が未コミット
- **B. README.md 整合**: analysis・settings を「未実装」と誤記している行の修正
- **C. 手動受け入れテスト**: 分析・設定・AVP の write 操作確認（Streamlit 停止 + DB バックアップ必須）
- **D. テスト補強**: `scan_library()` 統合テスト、API 異常系パス
- **E. 既知のドリフト**: `top_n` デフォルト差異、`selection_folder` 配置の注意
- **F. SQLite WAL + busy_timeout**: Streamlit アーカイブ後（Phase 5）に実施
- **G. 起動スクリプト**: `next build` 確認、本番起動スクリプト整備

---

## 2026-06-07 — Next.js: サイドバー折り畳み + Runtime パネル下部配置

**目的**: サイドバーをアイコン幅に折り畳めるトグルを追加。Runtime パネルを最下部に固定し、展開時にコンテンツが上方向に開くよう変更。

**関連ファイル**: `frontend/src/components/SidebarNav.tsx`

- **サイドバー折り畳み**: `PanelLeftClose`/`PanelLeftOpen` アイコンのトグルボタンを追加。
  折り畳み時は `w-14`（アイコンのみ）、展開時は `w-72`。ナビ項目はアイコンのみ表示となり `title` 属性でラベルを補完。
- **Runtime 最下部固定**: `mt-auto` で常にサイドバー最下部に配置。
- **上方向展開**: `<details>` を廃止し React ステートで制御。コンテンツはトリガー行の上に描画され、展開時に上側に開く。

---

## 2026-06-07 — Next.js: 5項目 UI 改善

**目的**: ①引いて即再生、②5列グリッド、③1列（運命）確認、④カード余白削減、⑤Select 表示修正。

**関連ファイル**: `frontend/src/app/page.tsx`, `frontend/src/app/tier2/page.tsx`,
`frontend/src/components/VideoGrid.tsx`, `frontend/src/components/VideoCard.tsx`

- **①自動再生**: 運命の1本を引いたとき `useEffect` + `useRef` で `playVideo(id)` を fire-and-forget。
  前回の id と比較して重複呼び出しを防ぐ。Tier1・Tier2 両方に適用。
- **②5列グリッド**: `VideoGrid` のデフォルト gridClassName を
  `grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5` に変更。
  運命タブは呼び出し元の `gridClassName="grid grid-cols-1 gap-3"` が優先されるため影響なし。
- **③1列（確認）**: Tier1・Tier2 の運命セクションはすでに `gridClassName` を明示渡し済みで変更不要。
- **④余白削減**: `VideoCard` の `CardContent` を `py-3 gap-2` → `py-1 gap-1` に変更。
- **⑤Select 表示**: `SelectValue`（raw value 表示）を `<span>{levelName(displayLevel)}</span>` に置換。

---

## 2026-06-07 — Runtime control 機能（lamp 表示 + サービス停止）

**目的**: Streamlit / FastAPI / Next.js の起動状態を Next.js サイドバーに lamp 表示し、各サービスを明示的に停止できる
開発用コントロールを追加する。ブラウザを閉じてもプロセスは止まらないため、手動停止の導線を用意する。

**関連ファイル**: `core/runtime_control.py`（新規）, `api/runtime.py`（新規）, `api/schemas.py`,
`api_app.py`, `frontend/src/components/SidebarNav.tsx`, `frontend/src/lib/{api,types}.ts`,
`docs/runtime-controls.md`（新規）, `requirements.txt`, `tests/test_runtime_control.py`（新規）, `tests/api/test_runtime.py`（新規）

- **core/runtime_control.py**: `psutil` でポート（8501/8000/3000）→ LISTEN プロセスの PID を判定し、状態
  （`running`/`stopped`/`unknown`）と PID を返す。`stop_service(name)` は対象プロセスを terminate（timeout 後 kill）。
  `SERVICE_SPECS` に streamlit/fastapi/nextjs を定義。
- **api/runtime.py**: `GET /api/runtime`（全サービスの lamp 状態）と `POST /api/runtime/{service}/stop`
  （未知サービスは 404、停止失敗は 500）。`api_app.py` に配線。`requirements.txt` に `psutil>=5.9.0,<7.0.0` を追加。
- **SidebarNav**: `RuntimeControlPanel` / `RuntimeLamp` / `StopConfirmDialog` を実装。`/api/runtime` を 4 秒間隔で
  ポーリングし lamp（緑=起動/灰=停止/黄=取得不可）を表示、停止は確認ダイアログ経由。Next.js 停止時は画面も終了する旨を注記。
- **注記**: 同日の「サイドバー折り畳み + Runtime パネル下部配置」エントリは**レイアウトのみ**。本エントリが Runtime 機能本体
  （状態取得・停止 API・core ロジック）を記録する。
- **検証**: `pytest tests/`（`test_runtime_control.py` / `test_runtime.py` 含む全件パス）。

---

## 2026-06-07 — Phase 4-C: AVP 並列再生を Next.js / FastAPI に移植

**目的**: 旧 Streamlit の AVP 並列再生（`ui/avp_tab.py`）を Next.js / FastAPI に移植する。API は AVP 起動のみを担当し、
横断選択・再生対象・評価待ちの状態は Next.js の Zustand で持つ。

**関連ファイル**: `api/avp.py`（新規）, `api/schemas.py`（`AvpPlayRequest`）, `api_app.py`,
`frontend/src/app/avp/page.tsx`（新規）, `frontend/src/lib/store.ts`, `frontend/src/components/VideoCard.tsx`,
`tests/api/test_avp.py`（新規）, `docs/context/{API_SPEC,MIGRATION_MAP,MIGRATION_PLAN,ACCEPTANCE_CRITERIA}.md`

- **POST /api/avp/play**: 最大4本の `video_ids` を受け取り `subprocess.Popen([avp_exe_path, ...paths])` で起動。
  Streamlit 現行同様、AVP 起動自体では `viewing_history` / `play_history` を記録しない。
- **エラー契約**: 400（0件 / 5件以上 / 非正ID / 重複ID）、404（動画 or ファイル不在）、409（`is_available=false` を含む）、
  500（`avp_exe_path` 未設定・実行ファイル不在・起動失敗）。
- **フロント**: `VideoCard` の AVP チェック（最大4本）、`/avp` で選択済み動画・再生対象・評価待ちカードを表示。
  状態は `useAvpStore`（`avpSelectedIds` / `avpLaunchSelectedIds` / `avpPlayingIds`）。評価・いいねは既存 API を流用。
- **検証**: `pytest tests/`（`test_avp.py` 含む全件パス）。

---

## 2026-06-07 — Phase 4-B 完了: 分析・設定画面 + 画面共通ワークスペース化

**目的**: 残作業だった `/analysis`・`/settings` を実装し Phase 4-B を完了。あわせて Tier1 / Tier2 の重複していた
ライブラリ/ランダム/運命の1本のUIを共通コンポーネントに切り出す。

**関連ファイル**: `frontend/src/app/{analysis,settings}/page.tsx`（新規）,
`frontend/src/components/{LibraryWorkspace,LibraryFilterBar,VideoActionPanel,VideoState}.tsx`（新規）,
`frontend/src/components/FilterPanel.tsx`, `frontend/src/app/{page,tier2/page}.tsx`,
`frontend/src/lib/{api,types}.ts`, `frontend/src/app/layout.tsx`, `frontend/package.json`（`recharts` / `react-is`）,
`docs/context/{IMPLEMENTATION_GUIDE,MIGRATION_PLAN}.md`

- **分析画面 `/analysis`**: `recharts` でチャート化。`getAnalysisData` / `getViewingHistory` / `getJudgmentHistory` /
  `getResponseTime` / `getAnalysisRankings` / `getSelectionTrend` / `getSelectionDistribution` を利用。
- **設定画面 `/settings`**: `getConfig` / `updateConfig`（config 編集）、`scanLibrary` / `scanSelection`（スキャン）、
  `createBackup`（DB バックアップ）を提供。
- **共通ワークスペース化**: `LibraryWorkspace`（KPI + 3サブタブの外枠）、`LibraryFilterBar`（フィルタ）、
  `VideoActionPanel`（`RandomPanel` / `FatePanel`）、`VideoState`（loading/empty/error）に切り出し、Tier1（`page.tsx`）と
  Tier2（`tier2/page.tsx`）が共通利用。`FilterPanel.tsx` は責務を縮小。
- **検証**: `frontend` で `npm run build` + `npx tsc --noEmit`。全ルート（`/`・`/tier2`・`/ranking`・`/analysis`・`/search`・
  `/avp`・`/settings`）が生成されることを確認。

---

## 2026-06-07 — 起動時 DB バックアップ + ランチャー改善

**目的**: 並走運用での事故に備え、起動時に1日1回 DB をバックアップする。あわせて開発ランチャーを疎通確認 + 自動ブラウザ起動に改善。

**関連ファイル**: `scripts/startup_backup.py`（新規）, `run_dev.bat`, `run_clipbox.bat`, `run_api.bat`

- **scripts/startup_backup.py**: `sqlite3` の `.backup`（read-only ソース接続）で `BACKUP_DIR` に
  `videos_startup_YYYYMMDD_HHMMSS.db` を作成。**当日分が既にあればスキップ**、最新10世代を残し古いものを削除。
  一時ファイル `.tmp` 経由で原子的に置換。
- **ランチャー**: `run_clipbox.bat`（Streamlit）・`run_api.bat`（FastAPI）の起動前に `startup_backup.py` を呼ぶ
  （失敗しても起動は継続）。`run_dev.bat` は全面改修し、起動時バックアップ → FastAPI / Next.js の precheck・既起動検出 →
  `/api/health` と `http://localhost:3000` の疎通待ち → 成功時に既定ブラウザを自動起動、失敗時はポート使用状況のヒントを表示。

---

## 2026-06-07 — バックエンド: keyword フィルタを core へ移設 + スキャンの保護ルート/単体反映

**目的**: API 層に重複実装されていた keyword 正規化を core に一本化し、ライブラリスキャンがセレクションフォルダ配下の
動画を誤って利用不可にしないようにする。Tier2 セレクション一覧にもライブラリ同等のフィルタを通す。

**関連ファイル**: `core/video_manager.py`, `core/app_service.py`, `core/scanner.py`, `core/file_ops.py`,
`api/videos.py`, `tests/test_scanner.py`, `tests/api/{test_videos_read,test_admin}.py`

- **keyword を core へ移設**: `VideoManager.get_videos(keyword=...)` を追加し、フィルタ適用後に
  `normalize_text` で本質的ファイル名へ正規化部分一致。`app_service.get_videos` も `keyword` を透過。
  `api/videos.py` 側の二重 normalize 実装を削除し core 委譲に統一（モジュール/関数 docstring も復元）。
- **scanner の保護ルート**: `FileScanner(scan_directories, protected_roots=...)` を追加。`scan_and_update` は
  見つからなかった動画でも **protected_roots 配下はスキップ**（is_available を落とさない）。
  `app_service.scan_library` は selection_folder を protected_root に渡し、ライブラリスキャン後に
  `scan_selection_folder` で同期する。`core/file_ops.create_file_scanner` も `protected_roots` を受け取る。
- **単体スキャンの不在反映**: `scan_single_directory` がスキャン後に当該ディレクトリ内で見つからなかった動画を
  `is_available=0` に更新（`_mark_missing_in_directory_unavailable`）。
- **/videos/selection 拡充**: `levels` / `storage` / `keyword` / `show_unavailable` を受け付けるようにし、Tier2 でも
  ライブラリ同等のフィルタが効くようにした。
- **検証**: `pytest tests/`（scanner / videos_read / admin のテスト追加分含む全件パス）。

---

## 2026-06-06 — Next.js: タブラベル修正・引くボタン大型化・カード全幅対応

**目的**: ユーザー指摘3点を修正。①タブ「選別の1本」→「運命の1本」、②引くボタンを大きくしてクリックしやすく、
③カードが表示エリアの横幅をフルに使うよう変更。

**関連ファイル**: `frontend/src/components/LibraryWorkspace.tsx`,
`frontend/src/components/VideoActionPanel.tsx`,
`frontend/src/components/VideoGrid.tsx`,
`frontend/src/app/page.tsx`, `frontend/src/app/tier2/page.tsx`

- **タブラベル**: Tier1・Tier2 共通の `LibraryWorkspace` 内「選別の1本」→「運命の1本」に変更
- **引くボタン大型化**: `FatePanel` のボタンを `size="sm"` → `size="lg"` + `px-8 py-5 text-base`
- **カード全幅**: `VideoGrid` のグリッドを `grid-cols-1 lg:grid-cols-2`（デフォルト）に変更し、
  カード幅を2列（~620px@1280px）に。運命/選別タブの1枚表示は `gridClassName="grid grid-cols-1 gap-3"` で
  フル幅（1280px）表示に対応するため `gridClassName` propsを追加。
- **検証**: Playwright で ①2列ライブラリ（ファイル名フル表示）、②大きい引くボタン、
  ③運命カードがフル幅で表示されることを確認 ✓

---

## 2026-06-06 — Next.js: カード横幅改善 + 運命カードの幅修正

**目的**: ライブラリグリッドのカードが狭く（1280px 環境で227px/4列）使いにくい問題と、
運命の1本タブのカードが `max-w-sm` ラッパーにより極端に狭くなっていた問題（4列グリッド内84px）を修正。

**関連ファイル**: `frontend/src/components/VideoGrid.tsx`,
`frontend/src/app/page.tsx`, `frontend/src/app/tier2/page.tsx`

- **VideoGrid**: `xl:grid-cols-4` → `2xl:grid-cols-4` に変更。1280px 環境では3列（~317px/枚）、
  1536px+ 環境で4列に。修正前比 +37% 幅改善。
- **運命カード幅**: Tier1・Tier2 の fate セクションから `<div className="max-w-sm">` ラッパーを削除。
  単体カードがグリッドの自然幅（~311px@1600px）を取るようになり可読性が向上。
- **再生ボタン動作確認**: Playwright で `POST /api/videos/{id}/play` が 200 OK を返すことを確認。
  UI 側は正常動作しており、動画が再生されない場合はサーバー側（`subprocess.Popen`）の
  ファイルパスまたはプレイヤー設定を確認すること。

---

## 2026-06-06 — Next.js: Tier1 を1画面3サブタブに統合（Streamlit構成へ整合）+ 細部パリティ

**目的**: Next.js 版の画面構成が Streamlit と乖離していた点を是正。最大の差は Tier1 が `/`（ライブラリ）と
`/random`（ランダム/運命）の2ルートに分裂していたこと。Streamlit は Tier1 を1画面3サブタブで提供しており、
これに整合させる。あわせて Streamlit の古い/異なる仕様を反映していた細部も修正する。

**関連ファイル**: `frontend/src/app/page.tsx`（全面改修）, `frontend/src/app/random/`（削除）,
`frontend/src/components/SidebarNav.tsx`, `frontend/src/app/tier2/page.tsx`, `frontend/src/components/Pagination.tsx`,
`README.md`, `docs/context/MIGRATION_PLAN.md`

- **Tier1 統合**: `/` を `/tier2` と同方式の「共有KPI4枚 + `<Tabs>`（📚ライブラリ/🔀ランダム/🎯運命の1本）」に
  再構成。`/random` ルートを廃止。ランダムは本数選択+シャッフル、運命の1本はボタン押下で1本取得
  （再生/判定/いいねで再抽選しない `invalidateKeys=[]` を維持）。見出しを「Tier 1 — 一次判定」に。
- **サイドバー**: 「Tier 1 ライブラリ」「Tier 1 ランダム/運命」の2項目を単一「Tier 1」へ統合し、Streamlit 順
  （Tier1→Tier2→ランキング→分析→検索→設定）に整列。AVP再生は本フェーズ対象外のため非掲載。未使用 `Shuffle` import 削除。
- **細部パリティ**: ランダム/運命の本数候補 `5/10/20/30`→`5/10/15/20`（Tier1・Tier2）。`Pagination` の
  `page_size` 候補 `20/50/100/200`→`50/100/200`。Tier1 KPI 判定率を `toFixed(1)`（Streamlit `:.1f` 準拠。
  `77.717…%`→`77.7%`）。
- **対象外**: 分析/設定/AVP の新規実装（README 残作業のまま）。`api/stats.py` の `top_n` 既定=10 と
  `API_SPEC.md` の表記は据え置き（フロントは 20 を送るため UI 影響なし・既知の軽微ドリフト）。
- **検証**: `npm run build`（生成ルート `/`・`/ranking`・`/search`・`/tier2`、`/random` 消失）+ `npm run lint` 通過。
  Streamlit(8501) と Next.js(3000)/FastAPI(8000) を起動し Playwright で画面構成を突合: Tier1 が単一サイドバー項目・
  3サブタブ・共有KPI4枚（820/2860/77.7%/0）で Streamlit と一致。タブ切替・シャッフル再抽選・運命の1本取得・
  検索（****117件）・ページング（50件/頁）・ランキング（総合/全期間/20件）を確認。書き込みは Streamlit 停止 +
  `POST /api/backup`（`videos_20260606_083850.db`）後に Next.js からいいね1件 → `POST /videos/4066/like` 200・
  カウント 0→1 を確認。

---

## 2026-06-06 — ドキュメント整備: README 新規作成・MIGRATION_PLAN 進捗更新

**目的**: 残作業の可視化とアプリ起動手順の明文化。

**関連ファイル**: `README.md`（新規）, `docs/context/MIGRATION_PLAN.md`（Phase 4-A を完了・4-B 残作業を明記）

- `README.md` を新規作成。Streamlit / FastAPI / Next.js の個別・一括起動手順、前提環境、移行期間中の注意事項、残作業一覧（分析・設定が未実装）を記載
- `MIGRATION_PLAN.md` の Phase 表を更新: 4-A を ✅完了、4-B に「実装済み: /tier2・/ranking、残: /analysis・/settings」を明記

---

## 2026-06-06 — Phase 4-B-1: ルーティング基盤 + Tier1 ランダム/運命 + 検索

**目的**: Phase 4-A の Next.js 基盤を拡張し、App Router の実ルーティング、Tier1 ランダム/運命の1本、
検索画面を追加する。`VideoCard` と API 通信基盤を再利用し、後続画面追加のパターンを固める。

**関連ファイル**: `frontend/src/components/{SidebarNav,VideoGrid,VideoCard}.tsx`,
`frontend/src/app/{random,search}/page.tsx`, `frontend/src/components/ui/tabs.tsx`,
`frontend/src/lib/api.ts`, `frontend/src/app/page.tsx`, `docs/context/{IMPLEMENTATION_GUIDE,MIGRATION_PLAN}.md`

- **ルーティング基盤**: `SidebarNav` を `next/link` + `usePathname()` に変更し、`/`・`/random`・`/search` を活線化。
  Tier2 / ranking / analysis / settings はプレースホルダとしてクリック不可のまま維持。
- **共通グリッド**: `VideoGrid` を追加し、表示中の動画だけを対象に `GET /likes` と `GET /stats/view-counts` を取得。
  ライブラリ画面も `VideoGrid` 利用へ変更。検索はクライアントページング後の表示ページ分だけを渡し、URL 長を抑制。
- **VideoCard 更新**: 画面別の `invalidateKeys` を受け取る方式へ変更。共通の KPI / likes / view-counts は更新しつつ、
  ランダム/運命画面では操作後に勝手な再抽選が起きないようリスト query の invalidate を抑制。利用不可動画の再生・判定は
  disabled、いいねは現行どおり許可。
- **Tier1 ランダム/運命**: `/random` を追加。Base UI tabs でランダムと運命の1本を切替。ランダムは本数選択 +
  シャッフルで再選出、運命の1本は初期自動取得せずボタン押下で取得。`204 No Content` は `null` として対象なし表示。
- **検索**: `/search` を追加。キーワード + 保存場所フィルタで `GET /api/videos/search` を呼び、正規化一致・利用不可込みの
  検索結果を表示。unpaged API のため、画面側でページングする。
- **検証**: `frontend` で `npm run build`（`/`, `/random`, `/search` 生成）+ `npm run lint` が通過。dev server で
  `/`・`/random`・`/search` は 200。API スモークで `/videos/unrated/random?n=10` は10件、`/videos/unrated/fate` は200、
  全角 `ＳＴＡＲ` + `storage=C_DRIVE` 検索は29件を確認。

---

## 2026-06-05 — Phase 4-A: Next.js 基盤 + Tier1 ライブラリ画面

**目的**: MIGRATION_PLAN Phase 4-A。`frontend/` に Next.js フロントエンド基盤を新設し、Tier1 ライブラリ画面
（一覧・フィルタ・検索・ソート・ページング・KPI・再生/判定/いいね）を最初の縦串として動かす。`VideoCard` と
API 通信の共通基盤（`lib/api.ts` + TanStack Query + Zustand）を確立する。

**関連ファイル**: `frontend/`（新規・Next.js 16 + React 19 + Tailwind v4 + shadcn/ui[base-nova/Base UI]）,
`frontend/src/lib/{api,types,store,levels}.ts`, `frontend/src/app/{layout,page,providers}.tsx`,
`frontend/src/components/{VideoCard,KpiCard,FilterPanel,MultiSelect,Pagination,SidebarNav}.tsx`,
`api/videos.py`（keyword 追加）, `tests/api/test_videos.py`（keyword テスト×3）, `docs/context/API_SPEC.md`,
`run_dev.bat`（新規）, `.gitignore`（frontend 節）

- **バックエンド拡張（作業0）**: `GET /api/videos` に `keyword` を追加（`normalize_text` でフィルタ適用後・ソート前に
  本質的ファイル名へ正規化部分一致）。検索 + フィルタ + ソート + ページングを1エンドポイントで合成可能にした
  （`/videos/search` は単独 `Video[]` のままで合成不可だったため）。`pytest tests/` **87 passed**（84→+3）。
- **フロント基盤**: `create-next-app`（TS / App Router / Tailwind v4 / src / `@/*`）+ `@tanstack/react-query` + `zustand`。
  shadcn/ui は `init -d`（preset base-nova = **Base UI** ベース。Radix ではない）。Base UI の Trigger は `asChild` ではなく
  **`render` プロップ**で合成する点に注意（Popover/Tooltip で適用）。
- **通信基盤**: `lib/api.ts`（fetch 薄ラッパ・`ApiError`・配列はカンマ区切り・`NEXT_PUBLIC_API_BASE` 既定
  `http://localhost:8000/api`）、`lib/types.ts`（snake_case 維持）、`lib/store.ts`（Zustand フィルタ状態、既定は
  exclude_selection=ON）、`app/providers.tsx`（QueryClientProvider + TooltipProvider）。
- **Tier1 画面**: KPI 4枚 + FilterPanel（レベル/登場人物/保存場所の複数選択=popover+command+checkbox、キーワード、
  セレクション除外/利用不可表示の switch、ソート select）+ VideoCard グリッド + Pagination。いいね数は `GET /likes`、
  視聴回数は `GET /stats/view-counts` を併用。**mutation は `onSettled` で invalidate**（成功時だけでなく 409
  ＝ファイル不在で is_available=0 更新済みでも一覧/KPI を再取得して反映）。再生はサーバー機で開く旨を tooltip 注記。
- **書き込み主体は当面 Streamlit**（並走制約）。Next.js からの write 検証は Streamlit 停止 + DB バックアップ前提
  （`run_dev.bat` に注意書き）。
- **レビュー修正（同日・追加）**: (1) `.gitignore` の `lib/`（Python 用）が `frontend/src/lib/` を巻き込み
  clean checkout でビルド不能になる問題を、`/lib/`・`/lib64/`（ルート限定）へ修正。(2) gitignore 済みなのに追跡され続けていた
  `data/user_config.json`・`.claude/settings.local.json` を `git rm --cached` で追跡解除（ローカルは残す）。
  `.claude/scheduled_tasks.lock` を gitignore 追加。(3) 利用不可動画は再生・判定を `disabled`（いいねは現行同様許可）。
  (4) 利用可否フィルタを3択（利用可能のみ/利用不可のみ/すべて表示）に整理し `availability`/`show_unavailable` へ写像。
- **検証**: `frontend` で `npm run build`（型/ビルド通過）+ `npm run lint`（0 error）。実機で利用可否「利用不可のみ」=93件
  （API と一致）・利用不可カードの再生/判定 disabled・キーワード検索（****=99件）・ページング・コンソールエラー0件を確認。

---

## 2026-06-05 — Phase 3 仕上げ: 回帰検証・api レビュー・docs 整合

**目的**: Phase 4-A（Next.js 着手）の前に、committed 済みの FastAPI バックエンドが健全かを再確認し、
`api/` 層レビューで粗を取り、計画書と実装の乖離を docs に反映して Phase 3 を正式に締める。

**関連ファイル**: `api/admin.py`（`PUT /config` をマージ保存に修正）, `tests/api/test_admin.py`（回帰テスト追加）,
`docs/context/IMPLEMENTATION_GUIDE.md`（API層を追記）, `docs/context/MIGRATION_PLAN.md`（確定構成の注記・Phase 完了印）

- **回帰検証**: `pytest tests/` を再実行し **83 passed** を再現。uvicorn 起動で実 DB に read スモーク
  （`/api/health`・`/api/videos`(total=214)・`/stats/kpi`・`/ranking?type=composite`・`/analysis/data`・
  `/analysis/rankings?kind=view_count` が 200、OpenAPI 29 パス）。`/ranking`・`/analysis/rankings` の素の 422 は
  必須パラメータ（`type`/`kind`）未指定による正しい挙動と確認。
- **api/ レビュー指摘と修正**: `PUT /config` が **全上書き + `ConfigModel` 未定義キーの脱落**で、GET→PUT
  ラウンドトリップ時に正本ファイルの `show_unavailable`/`show_deleted` 等を消す不具合を発見。`api/admin.py:put_config`
  を **`load_user_config()` へマージ保存**に変更（モデル化キーは送信値で置換＝全置換セマンティクス維持、未モデル化
  キーは保全）。回帰テスト `test_put_config_preserves_unmodeled_keys` を追加（**84 passed**）。
  - 据え置き（意図的設計と判断）: `admin.py` の `status!=success→500` 個別記述（3 箇所・可読性優先）、`actions.py` の
    存在確認 + 失敗時 re-query（404/409/500 を core 非依存で堅牢に判定するため）、`analysis._AVAIL_TO_BOOL` の
    `利用可`/`利用不可` キーは df 実値（`利用可`/`利用不可`/`不明`）と一致を確認し問題なし。
- **docs 整合**: `IMPLEMENTATION_GUIDE.md` に API層（`api_app.py` + `api/`）の構成・責務・read-only lifespan を追記。
  `MIGRATION_PLAN.md` タスク2 に「実装時の確定構成」（`scan.py`/`config.py`→`admin.py` 統合、`deps.py` 未作成、
  `_params.py`/`_serialization.py` 新設）を注記し、タスク5 の Phase 表で 3-A/3-B に ✅完了 を付与。

---

## 2026-06-05 — Phase 3-B: FastAPI 全エンドポイント実装

**目的**: API_SPEC の残り 28 エンドポイント（計 29 − Phase 3-A の `GET /api/videos`）を実装し、`core/` を
共有したまま read + mutation + 分析の全機能を FastAPI で提供する。Next.js 着手（Phase 4-A）の前提を満たす。
設計判断はユーザー合意で「過去文書整合より品質・安全・全体最適を優先」。

**関連ファイル**: `api/videos.py`(拡張), `api/stats.py`・`api/actions.py`・`api/likes.py`・`api/admin.py`・
`api/analysis.py`・`api/_params.py`・`api/_serialization.py`（新規）, `api/schemas.py`(拡張), `api_app.py`(配線),
`core/app_service.py`（wrapper 13本追加）, `core/analysis_service.py`（`get_kpi_stats` 移設・`get_like_count_ranking`
期間対応）, `ui/components/kpi_display.py`・`ui/cache.py`（KPI 移設に伴う参照更新）, `tests/api/`（conftest + 5本）,
`tests/test_analysis_service.py`（KPI/likes 期間テスト追加）, `docs/context/API_SPEC.md`（FastAPI 表記・契約更新）

- **Stage 1（core 整理）**: `get_kpi_stats(conn)` を `ui/components/kpi_display.py` → `core/analysis_service.py`
  へ移設（純 SQL・streamlit 非依存）。`ui/cache.py:get_kpi_stats_cached()` は `app_service.get_kpi_stats()` に委譲。
  `app_service` に薄い wrapper を追加（`get_videos`/`get_videos_by_ids`/`play_video`/`get_fate_video`/
  `get_unrated_random_videos`/`get_unrated_fate_video`/`search_videos`/`get_view_counts_map`/`get_last_viewed_map`/
  `get_filter_options`/`create_backup`/`get_kpi_stats`/`scan_library`）。`get_like_count_ranking` に任意
  `period_start/end` を追加（`liked_at` 絞り込み・既定 None で後方互換）。
- **Stage 2（read）**: 一覧 `GET /api/videos` に `sort`（`favorite_level`/`creation_date`/`view_count`/
  `last_viewed`/`title`/`modified`）+ `order` を追加。`/videos/{id}`・`/videos/search`・`/videos/unrated/{random,fate}`・
  `/videos/selection{,/fate}`・`/filter-options`・`/stats/{kpi,selection-kpi,view-counts,last-viewed}`・`/ranking`。
  **ルートは固定パス→`{id}` の順で定義**（FastAPI のパス解決順）。
- **Stage 3（mutation）**: `/videos/{id}/play`・`/level`・`/like`・`/likes`・`/scan/{library,selection}`・
  `GET/PUT /config`・`/backup`。HTTP マッピングは **404（事前存在チェック）/ 409（実行後 is_available==0）/ 500**
  を core 非改変・メッセージ非依存で実装。`scan_library` は config roots を **Path 化**して構築。
- **Stage 4（分析）**: `df_records()`（NaN→None / Timestamp→ISO / numpy→Python）で DataFrame を JSON 安全化。
  `/analysis/{data,viewing-history,judgment-history,response-time,rankings,selection-trend,selection-distribution}`。
  **rankings はフラット snake_case・型付き**（`is_available: bool|null` / `file_created_at: ISO|null` / `score: int`）。
- **契約整備**: 配列クエリは**カンマ区切り + repeated 両対応**（`api/_params.py`、不正整数は 422）。列挙パラメータ
  （sort/order/status/kind/type/period/availability）は `Literal` で 422。`config` に `selection_folder` を追加し、
  `/scan/selection` は folder 未設定時 400、`/stats/selection-kpi` は未設定時に全体 KPI。
- **テスト隔離**: `tests/api/conftest.py` で `core.config_utils.{CONFIG_PATH,SCAN_DIRECTORIES,DATABASE_PATH}` と
  `config.BACKUP_DIR` を tmp に monkeypatch（config_utils は import 時に定数束縛するため `config` だけでは不足）。
  play テストは `subprocess.Popen` を monkeypatch。
- **レビュー修正（同日・追加）**: (1) `PUT /level` の `level` を `Field(ge=-1, le=4)` 化し範囲外（-2/5/999）を 422、
  (2) セレクション folder 絞り込みを `core.models.is_path_within`（区切り境界尊重）へ置換し `C:\sel`/`C:\selection2`
  の誤マッチを解消（API `_folder_filter` + core `get_fate_video` 双方＝Streamlit にも波及）、
  (3) `/scan/library`・`/scan/selection` を error→500・folder 不在→404 に統一（backup と整合）、
  (4) `API_SPEC.md` の `/analysis/{data,rankings}` レスポンス形を実装一致（`{items,total}` / フラット型付き+`kind`）へ。
- **検証**: `pytest tests/` **83 passed**（既存 32 + 新規 51）。TestClient スモーク（実データ）で
  `/api/health`・`/stats/kpi`・`/videos`（total=214）・`/ranking`・`/analysis/data`（total=4056）・
  `/analysis/rankings` が 200、OpenAPI に 29 パス。`core/` 変更は KPI 移設＋wrapper＋likes 期間に限定、`ui/` は
  `kpi_display.py`/`cache.py` のみ、`data/` に差分なし。

---

## 2026-06-03 — Phase 3-A: FastAPI 基盤構築（最小・read-only）

**目的**: MIGRATION_PLAN の Phase 3-A を実装。FastAPI が `core/` を共有して `videos.db` から実データを read-only で配信できることを最小構成で実証する。Streamlit(8501) と並走しても DB へ書き込まない。`core/`・`ui/`・`streamlit_app.py`・`data/` は一切変更せず、新規ファイルのみ。

**関連ファイル**: `api_app.py`（新規）, `api/__init__.py`・`api/schemas.py`・`api/videos.py`（新規）, `tests/api/`（新規）, `run_api.bat`（新規）, `requirements.txt`（fastapi/uvicorn/httpx 追加）

- `api_app.py`: FastAPI エントリーポイント（既定 `127.0.0.1:8000`）。CORS で `localhost:3000` を許可。`GET /api/health` を提供。**lifespan は read-only**（起動時 `check_database_exists()` の確認のみ。`init_database`/`run_startup_migration` は実行せず DB 初期化は Streamlit に委ねる＝並走中の SQLite 同時書き込み回避）
- `api/schemas.py`: Pydantic モデル `VideoOut`（snake_case、派生 `is_selection_completed`/`is_judged` を含む。日時は ISO8601 文字列で素通し）, `VideosResponse`, `HealthResponse`。`VideoOut.from_video()` で dataclass → モデル変換
- `api/videos.py`: `GET /api/videos`。フィルタ（levels/performers/storage/availability/show_unavailable/show_deleted/needs_selection_filter/exclude_selection）を `app_service.create_video_manager().get_videos()` にマップ。サーバー側ソート（level/modified/created/title）+ ページング（page/page_size, 上限200）。ファサード経由のみ（core 変更不要）
- **設計**: `api/` は `core.app_service` のみを呼ぶ（ファサード一本化）。`streamlit` 非 import。view_count/last_viewed ソート・filter-options・mutation・wrapper は Phase 3-B 送り
- **検証**: `pytest tests/` 32 passed（既存27 + 新規API5）。uvicorn 起動で `/api/health`→`{status:ok, db_exists:true}`、`/api/videos?page_size=3`→実データ total=214、`/docs`(OpenAPI) 200 を確認。`git status` で `core/`・`ui/`・`streamlit_app.py`・`data/videos.db` に差分なし

---

## 2026-06-03 — Phase 3 準備: FastAPI/Next.js 移行計画の立案（ドキュメントのみ）

**目的**: Phase 2 の移行仕様書を土台に、FastAPI（バックエンド API）+ Next.js（フロントエンド）への移行を「Streamlit を動かしたまま安全に進める」ための実装計画を立案。コードは一切変更しない。

**関連ファイル**: `docs/context/MIGRATION_PLAN.md`（新規）

- バックエンドは **FastAPI** を採用（`analysis_service` の pandas DataFrame を Pydantic/JSON 直列化・自動 OpenAPI で扱える点、Next.js 側の型生成が容易な点が理由）。既存 docs の「Flask」表記は FastAPI 実装への読み替え（REST パス・スキーマは不変）と冒頭で明示
- `MIGRATION_PLAN.md`: 6タスクを報告フォーマット（結論・推奨/詳細/注意点・リスク）で記述 — (1)技術選定（FastAPI+uvicorn / Next.js App Router+TS / shadcn/ui、ポート8000推奨、`next build && next start`）、(2)ディレクトリ構成（`api_app.py`+`api/`、`frontend/`、`ui`と`api`を物理分離）、(3)FastAPI 実装計画（read系→中核mutation→統計→分析→スキャンの順、Pydantic response model + DataFrame→dict/list + datetime ISO8601、`TestClient`+既存`tmp_db`再利用）、(4)Next.js 実装計画（画面実装順、`VideoCard`等の再利用部品、TanStack Query=サーバー状態 / Zustand=クライアント横断状態、AVPはPhase4対象外）、(5)5フェーズ分割（各Phaseに**DB書き込み主体**を明記）、(6)リスク（SQLite同時書き込み・起動時migration競合・subprocess再生・CORS等）
- **検証**: `git status` で `core/`・`ui/`・`streamlit_app.py`・`data/` に差分なし（変更は docs/ と本ファイルのみ）。`pytest tests/` 全件グリーン（コード未変更の回帰なし確認）

---

## 2026-06-03 — Phase 2: Flask/Next.js 移行のための仕様書化（ドキュメントのみ）

**目的**: Flask（バックエンド API）+ Next.js（フロントエンド）への移行を「迷わず実行できる」状態にするための設計文書を新規作成。コードは一切変更しない。

**関連ファイル**: `docs/context/API_SPEC.md`（新規）, `docs/context/ACCEPTANCE_CRITERIA.md`（新規）, `docs/context/MIGRATION_MAP.md`（新規）

- `API_SPEC.md`: `core/app_service.py` を起点に Flask エンドポイントを6グループ（動画一覧・検索 / 再生・判定 / いいね / 統計・分析 / スキャン・設定 / DBバックアップ）で定義。共通事項に API 境界方針（app_service wrapper 一本化）・ローカル専用実行環境前提・Video レスポンススキーマ（snake_case、派生 `is_selection_completed` 含む）・論理削除ポリシー（一覧系のみ既定除外、単体取得は削除済みも返す）・ソート/ページング方針を明記。ファイル不在時の副作用（`is_available=0` 更新）を再生・判定エンドポイントに明記。分析画面は個別エンドポイントに分割。AVP は HTTP API 対象外として独立節に明記
- `ACCEPTANCE_CRITERIA.md`: Tier1/Tier2（各 ライブラリ/ランダム/運命の1本）・ランキング・分析・検索・AVP・設定の合否基準を日本語チェックリストで記述。異常系はファイル不在時の実挙動（履歴・レベル不変、可用性のみ更新）に整合
- `MIGRATION_MAP.md`: 現行 Streamlit UI 関数（`ui/*.py`, `streamlit_app.py`, `ui/cache.py`）と将来の Flask API の対応を画面単位の表で列挙
- **検証**: `git status` で `core/`・`ui/`・`streamlit_app.py` に差分なし（変更は docs/ と本ファイルのみ）。`pytest tests/` 全件グリーン（コード未変更の回帰なし確認）

---

## 2026-06-03 — Phase 1 追加整理: 残存デッドコード削除（調査サマリー実行）

**目的**: 読み取り専用の追加調査で特定した、active tree に残る未使用ヘルパーを削除。直近慣行に合わせ archive/ 退避ではなく直接削除（復旧は git 履歴）。

**関連ファイル**: `core/models.py`, `core/app_service.py`, `docs/reports/CODE_REVIEW_20260224.md`

- `core/models.py` から未使用4つを削除: `Video.display_name`（表示は essential_filename 直接利用に統一）・`Video.get_truncated_title()`・`create_badge()`（UI は `video_card._create_badge` を使用、重複）・`level_to_display()`（表示名は `FAVORITE_LEVEL_NAMES` に一本化）。併せて未使用となった `from config import FAVORITE_LEVEL_NAMES` import を除去
- `core/app_service.py` から未使用ラッパー `scan_and_update(scanner, conn)`（bare版）を削除。UI は `scan_and_update_with_connection()` のみ使用、テストは `scanner.scan_and_update()` を直接呼ぶため影響なし
- `CODE_REVIEW_20260224.md`: A-8 / B-3 / C-3 / C-5 を「✅ 解決済み (2026-06-03)」に更新（解決済み 11→15件）
- **保持**: `Video.is_judged()` は未使用だが今回サマリー対象外のため据え置き（次回検討候補）
- **検証**: `py_compile` OK、`pytest` 27 passed、Streamlit 起動して全7画面（Tier 1/2・ランキング・分析・検索・AVP・設定）を Playwright でスクショ・例外チェック → すべて例外0件、動画カード描画・ソート・KPI 正常を確認

---

## 2026-06-03 — Phase 1 追加整理: 未接続削除UI・KPI共通化・Streamlit warning対応

**目的**: Phase 1 準備の追加判断に基づき、復旧前提ではなく不要と判断した未接続コードを削除し、Tier 1/2 KPI 表示と用語 docs の一貫性を上げる。

**関連ファイル**: `core/video_manager.py`, `ui/analysis_tab.py`, `ui/components/kpi_display.py`, `ui/tier2_tab.py`, `streamlit_app.py`, `ui/{avp,extra,library,search,selection,unrated_random}_tab.py`, `docs/context/{DATA_MODEL,GLOSSARY}.md`

- `VideoManager.mark_as_deleted()` を削除。削除 UI は当面作らない方針のため、未接続の論理削除操作を active code から外した
- `ui/analysis_tab.py` の未使用 Matplotlib helper `_annotate_bars()` を削除。現行の分析描画は Plotly 経路に統一されている
- Streamlit の deprecated `use_container_width=True` を `width="stretch"` に置換
- KPI 表示を `KpiCard` / `render_metric_cards()` に抽象化し、Tier 2 は `render_selection_kpi_cards()` から共通コンポーネントを利用するよう変更
- `DATA_MODEL.md` を GLOSSARY 方針へ追従。概念名は「セレクション完了」、画面表示は「選別済み」、「ライブラリ取り込み済み」は使わない方針を明記
- `viewing_history` は集計用、`play_history` は再生ログ詳細として役割を明確化

---

## 2026-06-02 — Phase 1 追加整理: active 側の旧本体・shim・旧入口を除去
**目的**: Phase 1 アーカイブ済み機能の実体や後方互換 shim が active tree に残り、docs 上の「退避済み」と実ファイルの状態がずれていたため、復旧元を `archive/` に一本化する。
**関連ファイル**: `core/scanner.py`, `core/config_store.py`, `core/history_repository.py`, `ui/unrated_random_tab.py`, `ui/selection_tab.py`, `streamlit_app.py`, `core/app_service.py`, `core/video_manager.py`, `core/file_ops.py`, `ui/library_tab.py`, `ui/components/video_card.py`, `config.py`, `core/models.py`, `docs/context/{GLOSSARY,DATA_MODEL,PROJECT_OVERVIEW,IMPLEMENTATION_GUIDE}.md`, `CLAUDE.md`

- ファイルアクセス検知の active 本体 `detect_recently_accessed_files()` を `core/scanner.py` から除去。復旧元は `archive/detect_file_access.py`
- 後方互換 shim `core/config_store.py` / `core/history_repository.py` を active tree から除去。復旧元は `archive/`
- 旧トップレベル入口 `render_unrated_random_tab()` / `render_selection_tab()` を除去し、Tier 1/2 から呼ばれる下位モード関数だけを active に残した
- active ファイル内の commented archived code を削除。互換のための DB カラム・テーブル定義は残す
- 表示名の正本を `FAVORITE_LEVEL_NAMES` に寄せ、レベル表記を `LvN` に統一
- session key の `filter_actors` を `filter_performers` に移行し、旧キーは起動時に引き継いで削除
- 用語整理: `!` は現行の未選別 prefix、`?` は旧表記扱い。概念名は「セレクション完了」、画面表示は「選別済み」、「ライブラリ取り込み済み」は使わない
- `viewing_history` は集計用、`play_history` は再生ログ詳細として docs に明記

---

## 2026-06-02 — Phase 1 追加整理: archived 本体を archive/ に集約

**目的**: docs 上は archived とされているのに `core/` / `ui/` に tracked な実ファイルが残っていた状態を解消し、復旧元を `archive/` に一本化する。

**関連ファイル**: `core/settings.py`, `core/counter_service.py`, `core/snapshot.py`, `ui/analysis_tab_v2.py`, `archive/{settings,counter_service,snapshot,analysis_tab_v2}.py`, `core/app_service.py`, `core/video_manager.py`, `streamlit_app.py`, `tests/test_video_manager.py`, `docs/context/DATA_MODEL.md`

- `core/settings.py` / `core/counter_service.py` / `core/snapshot.py` / `ui/analysis_tab_v2.py` の active tree 側の重複を除去。実装本体は `archive/` 配下の退避済みコピーを復旧元とする
- archived 済みモジュールへのコメントアウト import / re-export を active code から除去
- `DATA_MODEL.md` に `is_judging` / `counters` / archived viewing_method の扱いを追記
- archived 機能に対する skip テストを削除

---

## 2026-06-02 — Phase 1 追加整理: デッドコード／死にUI／孤立 shim の退避（壁打ち合意 #1-8）

**目的**: Flask/Next.js 移行前に、Phase 1 アーカイブの波及で死んだコードと未使用要素を整理。方式は Phase 1 と同じ（archive/ 退避＋コメントアウトでコード保持）。

**関連ファイル**: `core/video_manager.py`, `core/app_service.py`, `core/file_ops.py`, `ui/library_tab.py`, `streamlit_app.py`, `tests/test_video_manager.py`, `tests/test_history_repository.py`, `archive/{config_store,settings,history_repository,video_manager_methods}.py`

- **死にUI: 「判定中のみ表示」フィルタ無効化**: `is_judging` は Phase 1 で `set_judging_state` が退避され常に0となり、ONにすると0件になる死にUIだった。`library_tab.py` のチェックボックス・`get_videos(show_judging_only=...)` 呼び出し・signature・`video_manager.get_videos` の `show_judging_only` 引数/分岐・`streamlit_app.py` の `filter_judging_only` 初期化をコメントアウト。`test_get_videos_filters_judging_only` を skip 化
- **VideoManager 未使用/重複メソッド退避**: `set_favorite_level`（`set_favorite_level_with_rename` の重複）・`get_random_video`・`get_viewing_stats`・`get_videos_with_stats`・`record_file_access_as_viewing`（ファイルアクセス検知退避により孤立）をコメントアウト。本体は `archive/video_manager_methods.py` に集約
- **core/settings.py アーカイブ**: 当初「スキャン設定と共用のため残す」とされたが、実際はスキャンと無関係で唯一の利用者（ファイルアクセス検知）が退避済の孤立モジュールと判明。`archive/settings.py` に退避し、`app_service` の `get_last_access_check_time`/`update_last_access_check_time` import・re-export をコメントアウト
- **孤立ファサード/re-export 整理** (`app_service.py`): `record_file_access_as_viewing`・`detect_recently_accessed_files`(＋`file_ops` 側 re-export)・`detect_recently_accessed_files_with_connection`・`insert_play_history`（video_manager は `core.database` を直接利用）をコメントアウト。`video_manager.py` の未使用 import `get_last_viewed_map` を除去
- **shim 退避**: `config_store.py`（どこからも未 import）・`history_repository.py`（test専用）を `archive/` に退避。`test_history_repository.py` は `core.database` 直参照に変更しカバレッジ維持
- **対象外**: docs 陳腐化更新（別タスク）、`mark_as_deleted`／コメント残骸／archive 内 .pyc（低優先で見送り）
- **検証**: `pytest` 27 passed / 2 skipped、`py_compile` OK、Streamlit 起動して Tier 1（判定中フィルタ消滅を確認）・分析ダッシュボードが例外なく描画されることを Playwright で確認

---

## 2026-06-02 — Phase 1 バグ修正: Tier 1/2 フラグメントエラー修正 + Tier 1 KPI 追加

**関連ファイル**: `ui/tier1_tab.py`, `ui/tier2_tab.py`

- **根本原因**: `render_tier1_tab` / `render_tier2_tab` に `@st.fragment` がなく、サブ関数内の `st.rerun(scope="fragment")` が fragment スコープ外から呼ばれ `StreamlitAPIException` が発生していた
- **修正**: 両ファイルに `@st.fragment` を追加。Streamlit はネストフラグメントをサポートするため `render_library_tab`（内側 fragment）との共存は問題なし
- **KPI 追加**: `render_tier1_tab` に `render_kpi_cards()` を追加。Tier 2 と同様のパターンで画面最上部に固定表示
- **session_state 初期化**: `render_tier1_tab` に `unrated_fate_video` の初期化を追加（`render_unrated_fate_mode` が前提とするキー）
- **動作確認**: Playwright でランダムタブ再生・運命の1本（Tier 1・Tier 2 両方）が全てエラーなしで動作確認済み

---

## 2026-06-02 — Phase 1: 整理・削減（アーカイブ + サイドバー再構成）

**関連ファイル**: `streamlit_app.py`, `core/video_manager.py`, `core/app_service.py`, `ui/components/video_card.py`, `ui/unrated_random_tab.py`, `ui/selection_tab.py`, `ui/tier1_tab.py`（新規）, `ui/tier2_tab.py`（新規）, `docs/context/GLOSSARY.md`（新規）

### アーカイブした機能（`archive/` に保存、呼び出し箇所はコメントアウト）

- **ファイルアクセス検知** (`detect_and_record_file_access`): サイドバーの「📊 視聴履歴を検知」ボタンと関数本体を無効化。→ `archive/detect_file_access.py`
- **判定中バッジ** (`is_judging`): `video_card.py` のバッジ描画と `_handle_play` / `_handle_judgment` の `set_judging_state` 呼び出しを無効化。DBカラム `is_judging` は保持。→ `archive/video_manager_methods.py`
- **手動視聴記録** (`mark_as_viewed`): 外部呼び出しなし、VideoManager からコメントアウト。→ `archive/video_manager_methods.py`
- **カウンター機能** (`counter_service.py`): `auto_start_counters` の全呼び出し箇所を無効化。`counters` テーブル・データは保持。→ `archive/counter_service.py`
- **スナップショット** (`snapshot.py`): `app_service.py` の re-export を無効化。→ `archive/snapshot.py`
- **分析ダッシュボード v2** (`analysis_tab_v2.py`): サイドバー選択肢から削除、import を無効化。→ `archive/analysis_tab_v2.py`

### サイドバー再構成

- **Tier 1 / Tier 2 構造**: サイドバーを「Tier 1・Tier 2・ランキング・分析ダッシュボード・検索・AVP再生・設定」の7項目に再編
- **`ui/tier1_tab.py`** 新規作成: ライブラリ（`render_library_tab`）・ランダム・運命の1本の3サブタブで Tier 1 画面を構成
- **`ui/tier2_tab.py`** 新規作成: セレクション KPI + ライブラリ・ランダム・運命の1本の3サブタブで Tier 2 画面を構成
- `ui/unrated_random_tab.py`: `_render_random_mode` / `_render_unrated_fate_mode` を public 化（tier1_tab から呼び出し）
- `ui/selection_tab.py`: `_render_library_mode` / `_render_random_mode` / `_render_fate_mode` を public 化（tier2_tab から呼び出し）

### その他

- **`docs/context/GLOSSARY.md`** 新規作成: Coding agent 向け用語集
- `tests/test_video_manager.py`: アーカイブ済みの `test_set_judging_state_start_and_finish` に `@pytest.mark.skip` を追加

---

## 2026-06-01 — 新機能: 未判定ランダムタブに「運命の1本」追加

**関連ファイル**: `ui/unrated_random_tab.py`, `core/video_manager.py`, `streamlit_app.py`

- **サブタブ化**: 未判定ランダムタブを「🔀 ランダム（従来のグリッド表示）」と「🎯 運命の1本」の2サブタブ構成に変更
- **運命の1本**: 未判定動画（`favorite_level = -1`）から純粋ランダムで1本を選出・自動再生・判定できる。ボタン押下で即座にプレイヤー起動
- **判定後**: カードを残したまま、再度ボタンを押すと次の1本を選出（手動）
- **`get_unrated_fate_video()`**: `VideoManager` に新メソッドを追加。`get_unrated_random_videos(1)` を委譲し、ドライブ確認・ファイル存在チェック込みの純粋ランダム選出を実現
- **session_state 同期**: `_handle_play` / `_handle_judgment` に `unrated_fate_video` の状態同期を追加（`is_judging` / `current_favorite_level` の即時反映）

---

## 2026-05-24 — 新機能: AVP並列再生タブ追加

**関連ファイル**: `ui/avp_tab.py`（新規）, `ui/components/video_card.py`, `ui/library_tab.py`, `ui/unrated_random_tab.py`, `ui/selection_tab.py`, `ui/search_tab.py`, `streamlit_app.py`, `ui/extra_tabs.py`, `core/config_utils.py`

- **AVP再生タブを新設**: サイドバーに「AVP再生」タブを追加。ライブラリ・ランダム・セレクション・検索の各タブでチェックした動画を一覧表示し、最大4本を選択してAwesome Video Playerで並列再生する
- **チェックボックス追加**: 全タブの `render_video_card` / `render_search_video_card` に `show_avp_checkbox` 引数を追加。カード左上に小さいチェックボックスを表示し、チェック状態はセッション全体の `avp_selected_ids: set[int]` で横断管理
- **AVP並列再生フロー**: ①各タブでチェック → ②AVP再生タブを開く → ③チェック済み一覧から再生する本数（1〜4本）を選択 → ④「▶ AVPでN本再生」ボタンでAVP起動 → ⑤下段に評価カード即時表示 → ⑥判定
- **設定タブ**: AVP実行ファイルパスの入力欄を追加。`user_config.json` の `avp_exe_path` キーで管理（デフォルト: `C:\Program Files (x86)\Awesome Video Player\AVPlayer.exe`）
- **サイドバーカウント表示**: チェック済み本数が1本以上のとき「AVP再生 (N)」と件数を表示
- **事前テスト済み**: Awesome Video Player に複数ファイルをコマンドライン引数で渡すと画面分割で並列再生されることを確認済み

---

## 2026-05-24 — 新機能: 「🎯 運命の1本」タブ追加

**関連ファイル**: `core/video_manager.py`, `ui/selection_tab.py`

- セレクションタブに「🎯 運命の1本」タブを新設（ライブラリ・ランダムと並列）
- **選出ロジック**: `needs_selection=True` の動画を前回視聴からの経過日数で重み付けして `random.choices()` で1本選出。未視聴は経過9999日扱い
- **UIフロー**: ボタン押下で自動再生 → 既存の評価UI（レベル選択・いいね）で判定 → 評価後も動画表示を維持。次の1本はボタン再押下で選出
- `VideoManager.get_fate_video(folder_path_str)` を `core/video_manager.py` に追加
- `get_last_viewed_map` を `core/database.py` から直接インポートして利用

---

## 2026-03-09 — 機能改善: ランキングタブ（集計期間・デフォルト・総合ランキング追加）

**関連ファイル**: `core/analysis_service.py`, `ui/ranking_tab.py`, `streamlit_app.py`

- **集計期間を整理**: 30日・90日を削除し180日を追加。デフォルトを「全期間」に変更
- **表示件数デフォルト変更**: 10件 → 20件
- **「総合」ランキング追加**: 視聴回数(×1.0)・視聴日数(×1.2)・いいね数(×1.5) を正規化合算し、レベル乗数（Lv4=1.5〜未判定=0.0）を掛けた複合スコア（最大555pt）。未判定動画は除外される
- **セッション状態の防衛的初期化**: 旧セッションに "30日"/"90日" が残っていた場合に "全期間" へリセット

---

## 2026-03-09 — 機能改善: ランキングタブのレベルフィルタをラジオボタンに変更

**関連ファイル**: `core/analysis_service.py`, `ui/ranking_tab.py`

### ランキングタブ: レベルフィルタの改善
- **目的**: 「Lv3のみ」トグルでは Lv4 を選択できなかった問題を解消
- `core/analysis_service.py`: `get_ranked_videos_for_tab()` の `lv3_only: bool` パラメータを `min_level: Optional[int] = None` に変更。`None`=フィルタなし、`3`=Lv3以上、`4`=Lv4のみ
- `ui/ranking_tab.py`: トグルをラジオボタン（「制限なし」「Lv3以上」「Lv4のみ」）に差し替え。列比率を `[4,1]` → `[3,2]` に変更

---

## 2026-03-09 — 機能追加: ライブラリタブにセレクション関連除外フィルタを追加

**関連ファイル**: `core/video_manager.py`, `ui/library_tab.py`, `streamlit_app.py`

### ライブラリタブ: セレクション関連ファイルの除外フィルタ
- **目的**: ライブラリタブに `[!]`（未選別）・`[+]`（セレクション完了）プレフィックスのファイルが混在する問題を解消
- `core/video_manager.py`: `get_videos()` に `exclude_selection: bool = False` パラメータを追加。`True` のとき `needs_selection = 0 AND is_selection_completed = 0` を WHERE 句に付加
- `streamlit_app.py`: `filter_hide_selection = True` をセッション状態の初期値として追加（デフォルトON）
- `ui/library_tab.py`: フィルタエクスパンダー内に「セレクション関連を除外」チェックボックスを追加、`get_videos()` 呼び出しに `exclude_selection` を渡す、`signature` にも含めてページリセットに対応

---

## 2026-03-03 — バグ修正: KPI計算の修正・セレクション関連改善

**関連ファイル**: `core/scanner.py`, `core/database.py`, `ui/components/kpi_display.py`, `ui/selection_tab.py`, `tests/test_scanner.py`

### A-1 差し戻し: scan_and_update() を旧動作に復元
- **経緯**: 2026-02-25のA-1修正（スキャン済みディレクトリ配下のみ is_available=0 更新）によりKPI数値が増加
- **原因**: Dドライブがlibrary_rootsに登録されている状態でDドライブ接続時にスキャンすると、Dドライブ動画が is_available=1 になりKPIに混入していた
- **修正**: `scan_and_update()` をスキャンで見つからなかった**全動画**を is_available=0 に更新する旧動作に戻す。スキャン済みディレクトリ0件のみスキップ（安全ガード維持）
- `tests/test_scanner.py`: `test_scan_only_updates_is_available_for_scanned_dirs` を旧動作確認テスト `test_scan_updates_all_not_found_videos_is_available` に書き換え、A-1固有の回帰テスト `test_scan_does_not_falsely_mark_sibling_dir_unavailable` を削除

### DBカラム追加: is_selection_completed
- **目的**: `+` プレフィックス（セレクション選別完了）動画を正確に管理するための専用フラグ
- `core/database.py`: `videos` テーブルに `is_selection_completed BOOLEAN DEFAULT 0` を追加、インデックス `idx_is_selection_completed` 追加、既存の `+` プレフィックスファイルを Python ループで移行
- `core/scanner.py`: `_process_file()` で `is_sel_completed` を UPDATE/INSERT に反映（以前は `_is_sel_completed` として捨てていた）

### KPI修正: セレクションフォルダの動画をKPI対象外に
- **原因**: セレクションフォルダ（`!`/`+` プレフィックス）の動画が未判定・判定済みKPIに混入していた
- `ui/components/kpi_display.py`: 未判定数・判定済み数のクエリに `AND needs_selection = 0 AND is_selection_completed = 0` を追加

### KPI修正: 本日の判定数からセレクション選別を除外
- **原因**: ライブラリ・未判定ランダムタブの「本日の判定数」がセレクションでの選別もカウントしていた
- `ui/components/kpi_display.py`: `today_judged_count` クエリに `AND was_selection_judgment = 0` を追加

### UI改善: セレクションランダムモードのデフォルトカラム数を5に変更
- `ui/selection_tab.py`: ランダムモードのカラム数ラジオボタンのデフォルトを 4 → 5 に変更（`index=1` → `index=2`）

---

## 2026-02-28 — 新機能: ランキングタブ追加

**関連ファイル**: `core/analysis_service.py`, `core/app_service.py`, `ui/ranking_tab.py`, `streamlit_app.py`

### 概要
視聴回数・視聴日数・いいね数の3種ランキングを動画カードとして表示する「ランキング」タブを追加。ナビゲーション位置はセレクションと分析ダッシュボードの間。

### 変更内容
- `core/analysis_service.py`: `_df_row_to_video()` ヘルパーと `get_ranked_videos_for_tab()` を追加
  - 集計期間（30日/90日/1年/全期間）・Lv3フィルター・利用可否フィルター・表示件数に対応
  - 同スコア時は `last_viewed_at` 降順でタイブレーク
- `core/app_service.py`: `get_ranked_videos_for_tab` を re-export
- `ui/ranking_tab.py`: ランキングタブ全実装（新規作成）
  - 1〜3位に🥇🥈🥉メダルバッジ、4位以降は #N 表示
  - いいね時に `_fetch_ranking.clear()` でキャッシュ無効化
  - `@st.cache_data(ttl=60)` で60秒キャッシュ
- `streamlit_app.py`: import 追加・ナビに「ランキング」挿入・main() に分岐追加

---

## 2026-02-28 — バグ修正: 未判定ランダムタブ・スキャン

**関連ファイル**: `core/video_manager.py`, `core/scanner.py`, `streamlit_app.py`, `tests/test_video_manager.py`, `tests/test_scanner.py`

### 未判定ランダムタブのバッジ更新バグ修正
- **原因**: `unrated_videos` セッションキャッシュ内の `Video` オブジェクトが DB 更新後も古い値のまま残る
- `streamlit_app.py` `_handle_play`: 再生成功後に `unrated_videos` 内の該当 Video の `is_judging=True` を即時反映 → 「判定中」バッジが表示されるよう修正
- `streamlit_app.py` `_handle_judgment`: 判定成功後に `current_favorite_level=new_level`, `is_judging=False` を即時反映 → 「未判定」バッジが判定後も残るバグを修正
- `tests/test_video_manager.py`: `test_set_favorite_level_updates_db_level` を追加（回帰テスト）

### スキャン: 兄弟ディレクトリ誤判定バグ修正
- **原因**: `startswith()` による文字列前方一致でパス比較していたため、`data_selection/` が `data/` のスキャン対象と誤認識される
- `core/scanner.py` `scan_and_update()`: パス比較を `startswith()` → `Path.is_relative_to()` に変更
- `tests/test_scanner.py`: `test_scan_does_not_falsely_mark_sibling_dir_unavailable` を追加

### 未判定ランダム: 不在ファイル除外
- **原因**: 外付けHDD未接続時、`is_available=1` のまま保持される HDD 上の動画が未判定ランダムに表示され、再生時に「ファイルが見つかりません」エラーになる
- `core/video_manager.py` `get_unrated_random_videos()`: DB取得後に `Path.exists()` で実在確認し、不在ファイルを除外
- ドライブ単位で接続確認をキャッシュし高速化（全件取得 + フィルタ方式）
- `tests/test_video_manager.py`: `test_get_unrated_random_videos_excludes_nonexistent_files` を追加

### スキャン: セレクションフォルダの同期
- `streamlit_app.py` `scan_files()` / `scan_files_for_settings()`: スキャン後に `app_service.scan_selection_folder()` を呼び出し、セレクションフォルダの `is_available` を同期するよう修正

---

## 2026-02-28 — Phase 3: 依存関係・層分離

**関連ファイル**: `requirements.txt`, `requirements-lock.txt`, `core/app_service.py`, `streamlit_app.py`

- `requirements.txt`: 全パッケージにバージョン上限を追加（例: `streamlit>=1.30.0,<3.0.0`）
- `requirements-lock.txt`: `pip freeze` で生成（ロックファイル）
- `core/app_service.py`: `run_startup_migration()` を追加。DBマイグレーションをAppServiceに委譲
- `streamlit_app.py`: `Migration` 直接利用 → `app_service.run_startup_migration()` に変更

## 2026-02-28 — Phase 2: ロギング

**関連ファイル**: `core/logger.py`（新規）, `core/scanner.py`, `core/settings.py`, `core/video_manager.py`, `core/database.py`, `.gitignore`

- `core/logger.py` 新規作成: `RotatingFileHandler`（`data/clipbox.log`, 5MB×3世代）
- 上記4ファイルの `print()` を `logger.xxx()` に全置換
- `.gitignore` に `data/clipbox.log*` を追加

## 2026-02-28 — Phase 1: テスト補強

**関連ファイル**: `tests/test_video_manager.py`, `tests/test_scanner.py`, `core/database.py`, `tests/test_backup.py`（新規）

- `test_video_manager.py`: `test_set_judging_state_start_and_finish`, `test_set_favorite_level_file_not_found_leaves_db_unchanged` 追加
- `test_scanner.py`: `test_scan_only_updates_is_available_for_scanned_dirs`, `test_scan_does_not_change_is_available_when_no_files_found` 追加
- `core/database.py`: `create_backup()` を追加（`BACKUP_DIR` に `.db` を生成）
- `tests/test_backup.py`: バックアップ機能のテスト新規作成

## 2026-02-25 — コードレビュー Top5 修正

**関連ファイル**: `core/scanner.py`, `core/counter_service.py`, `core/video_manager.py`, `streamlit_app.py`, `ui/cache.py`, `tests/conftest.py`

- **A-1** `core/scanner.py`: `scan_and_update()` の `is_available=0` 更新を実際にスキャンしたディレクトリ配下のレコードのみに限定。外付けHDD未接続時の誤フラグ落とし防止
- **B-4** `core/counter_service.py` + `core/video_manager.py`: `auto_start_counters(event_time, conn)` に `conn` 引数を追加しネスト接続による `SQLITE_BUSY` を排除
- **A-6** `streamlit_app.py`: `_handle_play`, `_handle_judgment`, `scan_files`, `detect_and_record_file_access` の後に `ui_cache.xxx.clear()` を追加
- **C-1** `ui/cache.py` 新規作成: `@st.cache_data` 関数を `core/app_service.py` から移動。core/ から `import streamlit` を削除
- **C-6** `tests/conftest.py` 新規作成: `tmp_db` フィクスチャで DB パスパッチを一元化

## 2026-02-23 — セレクション機能実装

**関連ファイル**: `core/scanner.py`, `core/database.py`, `core/models.py`, `core/video_manager.py`, `core/selection_service.py`（新規）, `ui/selection_tab.py`（新規）, `core/analysis_service.py`, `streamlit_app.py`

- `!` プレフィックス付き動画（セレクション未選別）の管理機能を追加
- `+` プレフィックス（セレクション選別完了）の対応
- `extract_essential_filename()` を4タプル返却に変更: `(level, essential, needs_selection, is_selection_completed)`
- `videos` テーブルに `needs_selection` カラム追加
- `judgment_history` テーブルに `was_selection_judgment` カラム追加
- セレクションタブ（`ui/selection_tab.py`）を新規追加
- 分析タブにセレクション成果分析セクションを追加
- 検索タブ（`ui/search_tab.py`）を追加

## 2026-02-21 — いいね機能実装

**関連ファイル**: `core/like_service.py`（新規）, `core/database.py`, `ui/components/video_card.py`

- `likes` テーブルを追加
- `core/like_service.py`: `add_like()`, `get_like_counts()` を実装
- 動画カードにいいねボタンを追加
- 利用不可動画でもいいね操作を許可

## 2026-01-25 — Phase 1: Streamlit UI 実装（初期）

**関連ファイル**: 全ファイル

- 3層アーキテクチャ（UI / Core / Data）の確立
- `core/video_manager.py`: ビジネスロジック中核
- `core/scanner.py`: ファイルスキャン・プレフィックス解析
- `core/database.py`: SQLite接続管理（コンテキストマネージャ）
- `core/models.py`: Video, ViewingHistory データクラス
- `core/counter_service.py`: カウンター機能
- `core/analysis_service.py`: 統計分析
- 動画一覧タブ・未判定ランダムタブ・分析タブ・設定タブの実装
