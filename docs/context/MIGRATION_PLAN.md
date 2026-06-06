# 移行実装計画（Streamlit → FastAPI + Next.js）

Phase 2 で作成した移行仕様書（`API_SPEC.md` / `ACCEPTANCE_CRITERIA.md` / `MIGRATION_MAP.md`）を土台に、
**FastAPI（バックエンドAPI）+ Next.js（フロントエンド）への移行を、Streamlit を動かしたまま安全に
進めるための実装計画**をまとめる。本ドキュメントは**計画・提案のみ**で、実装は含まない。

> **既存 docs との読み替え**
> `API_SPEC.md` / `MIGRATION_MAP.md` は本文中「Flask」表記だが、本計画では **FastAPI で実装**する。
> REST のパス・スキーマはフレームワーク非依存なので**エンドポイント定義は不変**。「Flask」と書かれた
> 箇所は「FastAPI で実装するバックエンドAPI」と読み替える。Phase 2 docs 自体は書き換えない。

## 前提・制約

- Streamlit は移行完了まで `localhost:8501` で動き続ける。
- FastAPI は `localhost:8000` で並走させる（ポート選定の理由はタスク1参照）。
- Next.js は `localhost:3000` で並走させる。
- `core/` と `data/videos.db` は変更しない（Streamlit と FastAPI が共有する）。
- `ui/` と `streamlit_app.py` は移行完了まで触らない。
- 移行は画面単位で進め、各画面の確認が取れてから次へ進む。
- Windows 環境・ローカル完結・個人利用が前提。

---

## タスク1: 技術選定の確認と補足

### 結論・推奨
- **バックエンド = FastAPI + uvicorn**。
- **フロントエンド = Next.js（App Router）+ TypeScript**、UI は **shadcn/ui（Radix UI ベース）**。
- 開発は `next dev` / `uvicorn --reload`、常用は `next build && next start` / uvicorn 常駐。
- 両サーバーは `concurrently` または起動 `.bat` で一括起動。

### 詳細

#### バックエンド: FastAPI を推奨する理由
- `core/analysis_service.py` が **pandas DataFrame** を返すため、レスポンス整形が移行の要になる。
  FastAPI は **Pydantic による JSON 直列化**と**自動 OpenAPI（/docs）**が標準で、レスポンス形を
  型で固定でき、Next.js 側の型生成（openapi-typescript 等）も容易。
- 本アプリは同期処理中心で async は必須ではないが、FastAPI は同期エンドポイント（`def`）も
  そのまま書けるため移行コストは Flask と大差ない。
- Flask でも実装可能だが、レスポンス型の明文化・ドキュメント自動生成の面で FastAPI が有利。

**`core/app_service` 接続方式（ファサード一本化）**
- FastAPI ルーターは **`core/app_service` のみを呼ぶ**。`VideoManager` や `core/database` を
  直接 import しない（境界が崩れるのを防ぐ）。
- 現状 `app_service` 未公開の `get_videos` / `get_videos_by_ids` / `play_video`（VideoManager
  メソッド）、`create_backup` / view-count map（database 関数）は、**`app_service` に薄い wrapper を
  追加して公開**してから API が呼ぶ（詳細は API_SPEC 共通事項）。

**CORS**
- ブラウザ（`localhost:3000`）から FastAPI（`localhost:8000`）への XHR は別オリジン扱いになるため
  CORS 設定が必要。`fastapi.middleware.cors.CORSMiddleware` で `http://localhost:3000` を許可する。

**Windows でのローカル常駐**
- 起動 `.bat`（例: `uvicorn api_app:app --host 127.0.0.1 --port 8000`）。
- 自動起動が必要ならタスクスケジューラの「ログオン時」トリガーに登録。

#### フロントエンド: Next.js
- ローカル専用なので **Vercel は不要**。開発は `next dev`、常用は **`next build && next start`**
  （`next start` はビルド済み成果物が前提なので `build` を必ず先行させる）。
- **TypeScript を推奨**（API レスポンス型との整合、補完、リファクタ耐性）。
- **shadcn/ui（Radix UI）** を推奨。コンポーネントをコピーして所有でき、ローカル個人利用で
  外部依存・スタイルの自由度・アクセシビリティのバランスが良い。
- 動画カードのような繰り返し UI は再利用コンポーネント化（タスク4参照）。

#### 開発環境
- **Node.js は LTS（20 以上）** を推奨。
- Python venv（バックエンド）と Node（フロント）は**別管理で共存**。リポジトリ直下に venv、
  `frontend/` 配下に `node_modules`。
- 両サーバー一括起動は **`concurrently`**（`package.json` の scripts）または起動 `.bat`
  （uvicorn と `next dev` を並行起動）。

### 注意点・リスク
- ポートは **8000 を推奨**。5000 は Flask の慣習色が強く、FastAPI 実装との読み替えで混乱しやすい。
  既存 docs の「Flask」表記と相まって誤解を生むため、ポートでは Flask 連想を避ける。
- shadcn/ui はコンポーネントをプロジェクトに取り込む方式なので、初期に `components.json` と
  Tailwind の設定が必要。導入順序を Phase 4-A に含める。

---

## タスク2: ディレクトリ構成の提案

### 結論・推奨
現行構成を維持したまま、FastAPI エントリーポイント `api_app.py` とルーター層 `api/`、Next.js の
`frontend/` を追加する。Streamlit の `ui/` と新 API の `api/` は物理的に分離する。

```
ClipBox/
├── streamlit_app.py        # 現行（触らない）
├── api_app.py              # 新規: FastAPI エントリーポイント（CORS設定・ルーター登録・起動時処理）
├── api/                    # 新規: FastAPI ルーター層
│   ├── __init__.py
│   ├── deps.py             # 共通依存（エラーハンドラ等）
│   ├── schemas.py          # Pydantic レスポンス/リクエストモデル
│   ├── videos.py           # /api/videos 系
│   ├── stats.py            # /api/stats, /api/ranking 系
│   ├── analysis.py         # /api/analysis 系
│   ├── scan.py             # /api/scan, /api/backup
│   └── config.py           # /api/config
├── core/                   # 現行のまま共有（Streamlit と FastAPI 両方が import）
├── ui/                     # 現行（触らない、Streamlit 専用）
├── frontend/               # 新規: Next.js プロジェクト
│   ├── app/                # App Router（画面）
│   ├── components/         # VideoCard, KpiCard, FilterPanel, ...
│   ├── lib/                # api.ts（fetch ラッパ）, types
│   └── ...
├── tests/                  # 既存 + tests/api/（FastAPI 用テスト）
├── data/                   # 現行のまま共有（videos.db）
└── docs/
```

> **実装時の確定構成（Phase 3-A/3-B 完了時点）**
> 提案時の `api/deps.py` / `api/scan.py` / `api/config.py` は、実装では次の通り集約・改名された
> （API パス・スキーマは不変）。本図は提案であり、正は実装。
> - `api/scan.py` + `api/config.py` → **`api/admin.py`**（scan/library・scan/selection・config(GET/PUT)・backup を統合）
> - `api/deps.py`（共通依存）→ **未作成**。エラーは各ルーターで `HTTPException` に寄せ、mutation の
>   404/409/500 マッピングは `api/actions.py` のローカルヘルパで処理（共通依存層は現時点で不要と判断）。
> - 追加新設: **`api/_params.py`**（配列クエリの両形式パース）・**`api/_serialization.py`**（DataFrame→JSON）。
> - スキャン/設定/バックアップのルーターは `api/stats.py`・`api/actions.py`・`api/likes.py`・`api/analysis.py`
>   と並ぶ（README 図の `api/scan.py`・`api/config.py` は `api/admin.py` に読み替え）。

### 詳細
- **エントリーポイントは `api_app.py`**（FastAPI 実態に合わせる。タスク例の `flask_app.py` は使わない）。
- `api/` の各ルーターは **`core/app_service` のみを import**。`core/database` や `VideoManager` を
  直接触らない（ファサード一本化）。
- `ui/`（Streamlit）と `api/`（FastAPI）はファイルを混在させない。`core/` は両者の共有層。
- Pydantic モデルは `api/schemas.py` に集約し、レスポンス形を一箇所で管理する。

### 注意点・リスク
- `.gitignore` に **`frontend/node_modules/`・`frontend/.next/`・`.env*`** を追加する。
- `core/` を共有するため、FastAPI からの import パスは Streamlit と同じ（`from core import ...`）。
  作業ディレクトリ依存にならないよう、起動 `.bat` はリポジトリルートから実行する。

---

## タスク3: FastAPI 実装計画

### 結論・推奨
**日常利用に必須な read 系から着手し、依存順（一覧 → 再生 → 判定 → いいね → 統計 → 分析 →
スキャン/設定）に広げる**。レスポンスは全て Pydantic モデル（snake_case）で固定し、pandas DataFrame は
API 層で dict/list に変換してから返す。テストは `TestClient` + 既存 `tmp_db` フィクスチャを再利用する。

### 詳細

#### 実装順序
1. **基盤**: ヘルスチェック（`GET /api/health`）+ 起動時 `init_database` / `run_startup_migration`
   （冪等。並走時の注意はタスク6）。
2. **一覧・選択肢（読み取り、テスト容易）**: `GET /api/videos`、`GET /api/filter-options`。
3. **単体・検索**: `GET /api/videos/{id}`（削除済みも返す）、`GET /api/videos/search`（normalize_text 仕様）。
4. **中核 mutation**: `POST /api/videos/{id}/play`、`PUT /api/videos/{id}/level`（副作用を持つ）。
5. **いいね**: `POST /api/videos/{id}/like`、`GET /api/likes`。
6. **統計**: `GET /api/stats/kpi`（`get_kpi_stats` の core 移設を含む）、`/stats/selection-kpi`、
   `/stats/view-counts`、`/stats/last-viewed`、`GET /api/ranking`。
7. **分析**: `/api/analysis/data` ほか（DataFrame → snake_case JSON 直列化）。
8. **スキャン・設定・バックアップ**: `POST /api/scan/library`、`POST /api/scan/selection`、
   `GET/PUT /api/config`、`POST /api/backup`。

#### エンドポイント別の概要

| エンドポイント | 複雑度 | 呼ぶ `app_service`（→ 実体） | 主要レスポンス | 注意点 |
|---|---|---|---|---|
| `GET /api/health` | 低 | （起動時処理のみ） | `{status, db_exists}` | — |
| `GET /api/videos` | 中 | wrapper → `VideoManager.get_videos` | `Video[]`（snake_case） | サーバー側でソート→ページング。`is_selection_completed`/`is_judged` を派生付与 |
| `GET /api/videos/{id}` | 低 | wrapper → `get_videos_by_ids` | `Video` | **削除済みも返す**（is_deleted 条件なし、現行踏襲） |
| `GET /api/videos/search` | 中 | `get_videos` + `normalize_text` | `Video[]` | NFKC・小文字化・カナ寄せで一致 |
| `GET /api/videos/unrated/random` | 中 | `VideoManager.get_unrated_random_videos` | `Video[]` | ドライブ存在確認のコスト。未接続ドライブはスキップ |
| `GET /api/videos/unrated/fate` | 低 | `get_unrated_fate_video` | `Video` | 純ランダム1本 |
| `GET /api/videos/selection` | 中 | `get_videos`（needs_selection_filter） | `Video[]` | `status=all\|unselected\|completed` を None/True/False にマップ |
| `GET /api/videos/selection/fate` | 中 | `get_fate_video` | `Video` | 経過日数重み付け |
| `GET /api/filter-options` | 低 | wrapper → distinct levels/performers/storage | `{levels, performers, storages}` | — |
| `POST /api/videos/{id}/play` | 高 | wrapper → `VideoManager.play_video` | `{status, message}` | **副作用**: 成功で viewing/play_history 記録、ファイル不在で `is_available=0`。再生はサーバー機で起動 |
| `PUT /api/videos/{id}/level` | 高 | `set_favorite_level_with_rename` | `{status, message}` | **副作用**: 成功でリネーム+judgment_history、ファイル不在で `is_available=0`（レベル/履歴は不変） |
| `POST /api/videos/{id}/like` | 低 | `add_like` | `{like_count}` | — |
| `GET /api/likes` | 低 | `get_like_counts` | `{video_id: count}` | N+1 回避済み |
| `GET /api/stats/kpi` | 中 | （`get_kpi_stats` を core 移設後に wrapper） | `{unrated_count, judged_count, judged_rate, today_judged_count}` | **要 core 移設**（現状 ui/components 依存） |
| `GET /api/stats/selection-kpi` | 低 | `get_selection_kpi` | 同形 | folder スコープ |
| `GET /api/stats/view-counts` `/last-viewed` | 低 | wrapper → database map 関数 | `{video_id: ...}` | — |
| `GET /api/ranking` | 中 | `get_ranked_videos_for_tab` | ランキング配列 | type/period/min_level/top_n |
| `GET /api/analysis/*` | 高 | `analysis_service.*` | snake_case JSON | **DataFrame → dict/list 化** |
| `POST /api/scan/library` | 中 | `create_file_scanner` + `scan_and_update_with_connection` | `{status, message}` | HTTP から scanner を渡せない→ config の `library_roots` からサーバー側で構築 |
| `POST /api/scan/selection` | 中 | `scan_selection_folder` | `{status, message, found_count}` | body の `folder`（省略時 config） |
| `GET/PUT /api/config` | 低 | `load_user_config` / `save_user_config` | config dict | — |
| `POST /api/backup` | 低 | wrapper → `database.create_backup` | `{filename, size}` | — |

#### Pydantic response model 方針
- 全レスポンスを **Pydantic モデル（snake_case）** で固定する（`api/schemas.py`）。
- `analysis_service` の **pandas DataFrame は API 層で dict/list 化**する
  （`df.to_dict(orient="records")`）。DataFrame をそのまま返さない。
- **datetime は ISO8601 文字列に直列化**してから返す（Pydantic の `model_config` / serializer で統一）。
- `analysis/rankings` 等の日本語カラム名は **snake_case（`rank, video, score, view_count,
  view_days, like_count` 等）に正規化**して返す（API_SPEC 既述）。

#### テスト方針
- **`pytest` + FastAPI `TestClient`**。
- **既存 `tests/conftest.py` の `tmp_db` フィクスチャをそのまま再利用**できる
  （config / core.database 双方の `DATABASE_PATH` を一時 DB に差し替えるため、API 経由の DB 操作も
  テスト DB に閉じる）。
- Streamlit テストと**同一 `tests/` に共存**し、API 用は `tests/api/` サブディレクトリに置く。

### 注意点・リスク
- `get_kpi_stats(conn)` は `ui/components/kpi_display.py` にあり、モジュール冒頭で `import streamlit`。
  **`core/` へ移設してから** `/api/stats/kpi` を実装する（Phase 3-B のタスク）。
- 再生（`play_video`）は **FastAPI 実行マシン上**で `subprocess.Popen(['start','',path], shell=True)`
  によりプレイヤーを起動する。リモート端末のブラウザではなくサーバー機で開く点を UI/ドキュメントで明示。
- mutation テストは本番 DB を汚さないよう、必ず `tmp_db` を使う。

---

## タスク4: Next.js 実装計画

### 結論・推奨
**ACCEPTANCE_CRITERIA の画面順に、Tier1 ライブラリから着手**する。サーバー状態は TanStack Query、
クライアント横断状態は Zustand に役割分担する。動画カードを中核の再利用コンポーネントにする。
**AVP は Phase 4 の実装対象に含めない**（Streamlit に残す）。

### 詳細

#### 画面実装の優先順位
1. **Tier1 ライブラリ**（フィルタ・検索・再生・判定・いいね・ページング。最も利用頻度が高く基礎）
2. **Tier1 ランダム / 運命の1本**
3. **Tier2 ライブラリ / ランダム / 運命の1本**（セレクション）
4. **検索**
5. **ランキング**
6. **分析ダッシュボード**（チャートが多く最後に回す）
7. **設定**（スキャン・バックアップ）

理由: 日常利用の中心であるライブラリ表示と再生・判定を最初に通すことで、`VideoCard` と API 通信の
共通基盤を早期に確立でき、以降の画面は組み合わせで実装できる。チャート中心の分析は依存が多く後段。

#### コンポーネント設計（`ui/components/video_card.py` を参考）
- **`VideoCard`** — 動画1件の表示 + 再生 / 判定（レベル変更）/ いいね。最も再利用される単位。
- **`KpiCard`** — KPI 1指標の表示（未判定/判定済み/判定率/本日の判定 等）。
- **`FilterPanel`** — レベル/登場人物/保存場所/状態フィルタ。
- **`Pagination`** — ページ移動 + page_size 切替。
- **`SidebarNav`** — Tier1 / Tier2 / 分析 / ツールのナビゲーション。

#### 状態管理の役割分担（明確化）
- **TanStack Query = サーバー状態**: 動画一覧・KPI・いいね数・分析データなど **API 由来データ**と、
  ローディング / エラー / 再フェッチ / キャッシュ無効化を担当（mutation 後の再取得もここ）。
- **Zustand = クライアント横断状態**: 画面設定・選択中フィルタ・AVP 選択ID など **API に依存しない
  クライアント状態**を担当。

#### AVP の扱い（明確化）
- AVP 並列再生は **Phase 2 HTTP API 対象外**であり、**Phase 4 の画面実装対象にも含めない**
  （現行の Streamlit + ローカル `subprocess` のまま残す）。
- AVP 選択ID 等の横断状態は「将来のローカル連携用の保持先」として Zustand 設計に触れるに留め、
  **Phase 4 では実装しない**。

#### Flask（FastAPI）API との通信
- **`fetch` ベースの薄い `lib/api.ts` ラッパ**で全リクエストを一元化（ベースURL `http://localhost:8000/api`）。
- **エラーハンドリングは TanStack Query に集約**（共通エラーバウンダリ / トースト）。
- ローディング状態も TanStack Query の `isLoading` / `isFetching` で表示制御。

### 注意点・リスク
- shadcn/ui の初期導入（Tailwind + `components.json`）は Phase 4-A の最初に行う。
- 再生ボタンは「サーバー機でプレイヤーが開く」挙動になるため、UI に注記するか確認動線を設ける。

---

## タスク5: 移行フェーズの分割

### 結論・推奨
Streamlit を止めずに段階移行する。**各 Phase に「DB 書き込み主体」を明示**し、「書き込みは一方の
サーバーのみ」を運用ルールではなく **Phase ごとの制約**に落とす（SQLite 同時書き込みリスク対策）。

### 詳細

| Phase | 目標（完了条件） | 作業概要 | DB 書き込み主体 | 完了確認（ACCEPTANCE_CRITERIA） | 工数 |
|---|---|---|---|---|---|
| **3-A: FastAPI 基盤** ✅完了 | API が起動し read 系が動く | セットアップ・`/api/health`・起動時 init/migration・一覧/検索/filter-options | **Streamlit のみ**（FastAPI は read 中心） | read 系の手動確認（一覧・検索が返る） | 小 |
| **3-B: 全エンドポイント** ✅完了 | API_SPEC 全エンドポイント + pytest 緑 | 残り全 API 実装、`get_kpi_stats` の core 移設、app_service wrapper 追加 | mutation は**テスト DB か Streamlit 停止時のみ検証**（両サーバー同時に再生/判定/スキャンしない） | `tests/api/` で全エンドポイント pass | 大 |
| **4-A: Next.js 基盤** ✅完了 | Tier1 ライブラリが表示・操作できる | プロジェクト初期化、shadcn/ui 導入、`VideoCard`/`lib/api.ts`、Tier1 ライブラリのみ | **引き続き Streamlit**（Next.js は read 表示確認が中心。write 検証は Streamlit 停止時） | Tier1 ライブラリの正常系チェックリスト | 中 |
| **4-B: 全画面** 🚧実装中（残: 分析・設定） | 全画面が Next.js で動く | 残り全画面実装、書き込み操作を Next.js 経由へ。実装済み: `SidebarNav` 実ルーティング・`/search`・`VideoGrid`（4-B-1）、`/tier2`（Tier2セレクション全モード）、`/ranking`。**Tier1 は `/` の1画面3サブタブ（ライブラリ/ランダム/運命の1本）に統合し `/random` ルートは廃止＝Streamlit構成に整合**。**残: `/analysis`・`/settings`（`enabled: false` プレースホルダ）** | **Next.js 経由（FastAPI）へ段階移行**（移行済み画面は Streamlit で同操作しない。並走中 write 検証は Streamlit 停止 + DB バックアップ） | 全画面の ACCEPTANCE_CRITERIA 通過 | 大 |
| **5: Streamlit archive** | 並走解消 | 全受け入れ条件通過後に Streamlit を `archive/` へ。任意で WAL 化等の core 最適化 | **FastAPI 単独** | 全 ACCEPTANCE_CRITERIA が FastAPI/Next.js で通る | 小 |

### 注意点・リスク
- 並走期間（3-A〜4-B）は、**書き込みを行う画面・操作を一方のサーバーに固定**する。誤って両方から
  再生・判定・スキャンを実行しないよう、Phase ごとの「書き込み主体」を実装者向け注意として明記する。
- Phase 4-B の段階移行では、「この画面はもう Next.js 側で操作する」と決めたら Streamlit 側の同じ
  書き込み操作は使わない（read 表示のみ）。

---

## タスク6: リスクと対策の洗い出し

### 結論・推奨
最大のリスクは **`videos.db` への同時書き込み（SQLITE_BUSY）と起動時 migration の競合**。
並走中は「書き込み主体を一方に固定」「FastAPI の起動時 migration は Streamlit 停止時のみ」を徹底する。
WAL 化等の core 改善は制約上 Phase 5 以降に回す。

### 詳細

| リスク | 内容 | 対策 |
|---|---|---|
| **SQLite 同時書き込み** | `get_db_connection()`(core/database.py:29) は素の `sqlite3.connect` で **WAL 無効・busy_timeout 未設定**。Streamlit(8501) と FastAPI(8000) が同時に書くと `SQLITE_BUSY`。 | 並走中は**書き込み主体を一方に限定**（タスク5 の Phase 別主体）。`core/` を変更できる Phase 5 以降に **WAL + busy_timeout** を導入。 |
| **起動時 migration の競合** | Streamlit / FastAPI が両方とも起動時に `init_database` / `run_startup_migration` を実行 → 同時起動で migration 書き込みが競合し得る。 | 初期移行（level 0→-1）完了後は実質 no-op だが、**FastAPI の起動時 migration は「Streamlit 停止時に一度だけ」実行**を推奨。並走運用中の FastAPI は health/read 起動に留め、冪等性を前提に同時実行を避ける。 |
| **subprocess 再生** | `play_video` は `subprocess.Popen(['start','',path], shell=True)`。 | 同一機・`shell=True` の `start` なら**日本語/スペース入りパスも起動可**。リモート端末のブラウザからでも**起動先はサーバー機**である点を UI/docs に明記。 |
| **ファイルパスの日本語・スペース** | API でパスを受け渡す際の文字化け・分割。 | API は **snake_case JSON で path をそのまま受け渡し**、起動はサーバー側。エンコーディングは UTF-8 で統一。 |
| **FileScanner を API から呼ぶ** | HTTP リクエストから scanner オブジェクトを渡せない。 | config の **`library_roots` からサーバー側で `create_file_scanner` して構築**（body 不要）。セレクションは body の `folder`（省略時 config）。 |
| **セッション/状態** | FastAPI はステートレス。AVP 選択リスト等の横断状態の置き場所。 | API に持たせず**フロント側（Zustand）で保持**。AVP 自体は Phase 4 対象外。 |
| **CORS** | `localhost:3000` → `localhost:8000` は別オリジン。 | `CORSMiddleware` で `http://localhost:3000` を許可。 |

### 注意点・リスク
- `scan_and_update()` は「スキャン対象外の動画を `is_available=0` にする」副作用を持つ。API 経由の
  ライブラリスキャンでも全ドライブ未接続時の安全ガード（0件ならスキップ）が効くことを確認する。
  セレクションフォルダの個別スキャンは `scan_single_directory`（`scan_selection_folder` 経由）を使う。
