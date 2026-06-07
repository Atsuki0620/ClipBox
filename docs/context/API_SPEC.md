# API 仕様書（FastAPI）

ClipBox を **Python FastAPI（バックエンド API）+ Next.js（フロントエンド）** に移行する際の
HTTP API 設計仕様。現行 Streamlit UI が `core/` を呼び出している箇所を、FastAPI エンドポイントとして
再定義したもの。FastAPI は `core/` をそのまま再利用する（`ui/` と `streamlit_app.py` は移行完了後に破棄）。
**Phase 3-B〜4-C で全ドメインエンドポイントを実装済み**（AVP 起動・分析トレンドを含む）。加えて開発時用の
**運用エンドポイント（Runtime、末尾節参照。既定は無効）**を提供する（実体は `api_app.py` + `api/`。並走中は起動時の
DB 初期化を Streamlit 側に委ね、API の lifespan は read-only を維持）。

---

## 共通事項

### ベースパス
すべてのエンドポイントは `/api` 配下に置く。

### API 境界方針（ファサード一本化）
Flask の各ビューは **`core/app_service.py` のみ**を呼び出す（ファサード一本化）。
ただし現状 `app_service.py` には未公開の実体がある:

| 実体 | 所在 | 現状の公開状況 |
|---|---|---|
| `get_videos` / `get_videos_by_ids` / `play_video` / `get_fate_video` / `get_unrated_random_videos` / `get_unrated_fate_video` | `core/video_manager.py`（VideoManager メソッド） | app_service には `create_video_manager()` のみ公開 |
| `create_backup` | `core/database.py` | 未公開 |
| `get_view_counts_map` / `get_last_viewed_map` / `get_distinct_*` | `core/database.py` | 未公開（現状は `ui/cache.py` が直接呼ぶ） |
| `get_kpi_stats`（Tier1 KPI） | `core/analysis_service.py` | **core へ移設済み（Phase 3-B）**。`app_service.get_kpi_stats()` で公開 |

→ **Phase 3-B で `core/app_service.py` に薄い wrapper 関数を追加済み**（`get_videos` / `get_videos_by_ids` /
`play_video` / `get_fate_video` / `get_unrated_random_videos` / `get_unrated_fate_video` / `search_videos` /
`get_view_counts_map` / `get_last_viewed_map` / `get_filter_options` / `create_backup` / `get_kpi_stats` /
`scan_library`）。FastAPI（`api/`）は **app_service 経由でのみ**呼ぶ。各エンドポイントの「現行対応関数」には
実体（`VideoManager.xxx` / `database.xxx`）を併記する。

### 実行環境前提（重要）
本アプリは**ローカル専用**である。FastAPI は動画ファイルへ直接アクセスできる**同一 Windows 環境**で動作する。
`POST /api/videos/{id}/play` 等のプレイヤー起動は **FastAPI 実行マシン上**で行われ、リモートのブラウザ端末ではない。
複数端末・リモート配信は想定しない。

### Video レスポンススキーマ
JSON は **snake_case 固定**（現行 DataFrame の日本語列名は API では使わない）。
`core/models.py` の `Video` dataclass フィールド + 派生プロパティ:

```json
{
  "id": 123,
  "essential_filename": "sample.mp4",
  "current_full_path": "D:/videos/###_sample.mp4",
  "current_favorite_level": 3,
  "file_size": 104857600,
  "performer": "name",
  "storage_location": "EXTERNAL_HDD",
  "last_file_modified": "2026-01-01T12:00:00",
  "created_at": "2026-01-01T12:00:00",
  "last_scanned_at": "2026-06-01T09:00:00",
  "notes": null,
  "file_created_at": "2025-12-01T00:00:00",
  "is_available": true,
  "is_deleted": false,
  "is_judging": false,
  "needs_selection": false,
  "is_selection_completed": false,
  "is_judged": true
}
```

- `is_selection_completed`（bool）: ファイル名が `+` プレフィックスで始まるか（`Video.is_selection_completed` property）。
- `is_judged`（bool）: プレフィックスの有無で判定済みかを示す派生値（`Video.is_judged()`）。
- `current_favorite_level`: `-1`=未判定, `0`=Lv0, `1`〜`4`=Lv1〜Lv4。

### 論理削除ポリシー
- **一覧系**（`GET /api/videos` 等）は既定で `is_deleted = 0` を除外する（`show_deleted=true` で含める）。
- **単体取得** `GET /api/videos/{id}` は現行 `get_videos_by_ids` を踏襲し、**削除済みも返す**（`is_deleted` 条件なし）。

### ソート / ページング方針
現行の `view_count` / `last_viewed` ソートは、視聴回数マップ・最終視聴日時マップを別取得して UI 側で並べ替えていた。
API では **サーバ側で集計・ソートしてからページング**する方針とする（フロントの全件取得を避ける）。
一覧 API は `sort` / `order` / `page` / `page_size` を受け取り、ページング後の結果を返す。

### 配列クエリパラメータ
`levels` / `storage` / `video_ids` は **カンマ区切り（`?levels=3,4`）と repeated（`?levels=3&levels=4`）の
両形式**を受け付ける（`api/_params.py`）。整数配列の不正値は 422 を返す。

### 共通エラー
- `404 Not Found`: 対象動画が存在しない。
- `500 Internal Server Error`: DB 接続失敗・予期しない例外。

---

## 1. 動画一覧・検索

### GET /api/videos
**説明**: フィルタ条件に合致する動画一覧を返す（Tier1 ライブラリ・検索の基盤）。

**クエリパラメータ**:
- `levels`: int[] — お気に入りレベル（例 `3,4`）。省略時: 全レベル。
- `storage`: str[] — `C_DRIVE` / `EXTERNAL_HDD`。省略時: 全ストレージ。
  ※ `performers`（登場人物）フィルタは**廃止**（フォルダ名由来の暫定抽出でフィルタに使えていなかったため）。
- `availability`: str — `available` | `unavailable`（省略時: `show_unavailable` に従う）。
- `show_unavailable`: bool — 利用不可も含めるか（デフォルト false。`availability` 未指定時のみ有効）。
- `show_deleted`: bool — 論理削除済みも含めるか（デフォルト false）。
- `needs_selection_filter`: bool — `true`=セレクション対象のみ / `false`=通常のみ / 省略=全て。
- `exclude_selection`: bool — `needs_selection=1` と `is_selection_completed=1` を除外（デフォルト false）。
- `keyword`: str — 本質的ファイル名の部分一致検索。`normalize_text()`（NFKC・小文字化・カナ寄せ）で正規化して
  一致判定し、フィルタ適用後・ソート前に絞り込む（省略時は検索なし）。Tier1 ライブラリの検索はこのパラメータで行う。
- `sort`: str — `favorite_level` | `creation_date` | `view_count` | `last_viewed` | `title` | `modified`。
- `order`: str — `asc` | `desc`（既定: `title` は `asc`、その他は `desc`）。
- `page`: int（デフォルト 1） / `page_size`: int（デフォルト 100、上限 200）。

**レスポンス**: `{ "items": Video[], "total": int, "page": int, "page_size": int }`（200 OK）

**エラーケース**: 500 DB接続失敗。

**現行対応関数**: `VideoManager.get_videos()`（`core/video_manager.py`）。view_count/last_viewed ソートは
現行 `ui_cache.get_view_counts_and_last_viewed()` を併用。

---

### GET /api/videos/{id}
**説明**: 動画IDを指定して1件取得する。

**パスパラメータ**: `id`: int。

**レスポンス**: `Video`（200 OK）。**削除済み動画も返す**（現行踏襲）。

**エラーケース**: 404 動画なし。

**現行対応関数**: `VideoManager.get_videos_by_ids([id])`（`is_deleted=0` 条件を持たない）。

---

### GET /api/videos/search
**説明**: キーワードでファイル名検索する。

**クエリパラメータ**:
- `keyword`: str — 検索語。
- `storage`: str[] — `C_DRIVE` / `EXTERNAL_HDD`（省略時: 全ストレージ）。

**正規化仕様**: 比較は `core/models.py:normalize_text()` に従い、**NFKC 正規化 → 小文字化 → カナ差吸収**で
全角半角・大小・カタカナ/ひらがなを吸収したうえで部分一致する。

**レスポンス**: `Video[]`（200 OK）

**エラーケース**: 500 DB接続失敗。

**現行対応関数**: `VideoManager.get_videos(storage_locations=...)` + `normalize_text()` による絞り込み（`ui/search_tab.py`）。

---

### GET /api/videos/unrated/random
**説明**: 未判定（level -1）動画をランダムに n 本返す（Tier1 ランダム）。ファイル存在チェック済み。

**クエリパラメータ**: `n`: int — 取得本数。

**レスポンス**: `Video[]`（200 OK）

**現行対応関数**: `VideoManager.get_unrated_random_videos(n)`。

---

### GET /api/videos/unrated/fate
**説明**: 未判定動画を**純ランダム**に1本返す（Tier1「運命の1本」）。

**レスポンス**: `Video`（200 OK）／ 該当なしのとき `204 No Content`。

**現行対応関数**: `VideoManager.get_unrated_fate_video()`。

---

### GET /api/videos/selection
**説明**: Tier2 ライブラリ用。指定セレクションフォルダ配下の動画を選別状態でフィルタして返す。

**クエリパラメータ**:
- `folder`: str — セレクションフォルダパス（必須）。
- `status`: str — `all` | `unselected` | `completed`（デフォルト `all`）。
  現行は `needs_selection_filter = None / True / False` に対応する（`ui/selection_tab.py`）:
  - `all` → `needs_selection_filter=None`
  - `unselected` → `needs_selection_filter=True`（`!` 未選別）
  - `completed` → `needs_selection_filter=False`
- `sort` / `page` / `page_size`: 一覧 API と同様。

**レスポンス**: `{ "items": Video[], "total": int, ... }`（200 OK）

**備考**: Tier2 のランダム表示は、この一覧結果に対し**クライアント側で `sample`** する想定（専用 API は設けない）。

**現行対応関数**: `VideoManager.get_videos(needs_selection_filter=..., ...)` + フォルダ絞り込み（`ui/selection_tab.py:227`）。

---

### GET /api/videos/selection/fate
**説明**: Tier2「運命の1本」。未選別動画から**最終視聴日からの経過日数で重み付け**して1本選出する。

**クエリパラメータ**: `folder`: str — セレクションフォルダパス。

**レスポンス**: `Video`（200 OK）／ 該当なしのとき `204 No Content`。

**現行対応関数**: `VideoManager.get_fate_video(folder_path_str)`。

---

### GET /api/filter-options
**説明**: ライブラリのフィルタ UI 構築用に、使用中のレベル・保存場所の選択肢を返す（performers は廃止）。

**レスポンス**（200 OK）:
```json
{ "favorite_levels": [-1, 0, 3, 4], "storage_locations": ["C_DRIVE", "EXTERNAL_HDD"] }
```

**現行対応関数**: `app_service.get_filter_options()` → `database.get_distinct_favorite_levels/storage_locations()`。

---

## 2. 再生・判定

### POST /api/videos/{id}/play
**説明**: 動画をローカルプレイヤーで再生し、視聴履歴を記録する。

**リクエストボディ**（任意）:
```json
{ "player": "default", "trigger": "library", "library_root": "D:/videos", "internal_id": "..." }
```

**副作用**:
- **成功時**: `viewing_history`（`APP_PLAYBACK`）を記録。`player` 指定時は `play_history` も記録。
- **ファイル不在時**: 当該動画を **`is_available = 0` に更新**し、エラーを返す（視聴履歴は記録しない）。

**レスポンス**: `{ "status": "success", "message": "再生を開始しました" }`（200 OK）

**エラーケース**:
- 404: 動画が見つからない（`status: error`）。
- 409 等: ファイルが見つからない → `is_available=0` 更新 + `status: error`（`core/video_manager.py:258-267`）。
- 500: 再生プロセス起動失敗。

**現行対応関数**: `VideoManager.play_video(video_id, *, player, trigger, library_root, internal_id)`。

---

### PUT /api/videos/{id}/level
**説明**: お気に入りレベルを変更し、ファイル名をプレフィックス付きでリネームする。

**リクエストボディ**:
```json
{ "level": 3 }
```
- `level`: int または null。`null`=未判定（プレフィックスなし）, `0`=Lv0, `1`〜`4`=Lv1〜Lv4。
  許容は `null` / `-1`〜`4`。範囲外（`-2`, `5`, `999` 等）は **422**。

**副作用**:
- **成功時**: ファイルをリネームし、`current_favorite_level` を更新、`judgment_history` を記録。
- **ファイル不在時**: **`is_available = 0` に更新**し、エラーを返す。
  **レベル・ファイル名・判定履歴は変更しない**（`core/video_manager.py:326-331`）。

**レスポンス**: `{ "status": "success", "message": "..." }`（200 OK）

**エラーケース**:
- 404: 動画が見つからない。
- 409 等: ファイル不在 → `is_available=0` 更新 + `status: error`（他は不変）。
- 500: リネーム失敗。

**現行対応関数**: `app_service.set_favorite_level_with_rename(video_id, new_level)` → `VideoManager.set_favorite_level_with_rename()`。

---

### POST /api/avp/play
**説明**: 指定した動画を Awesome Video Player に渡して最大4本まで並列再生する。

**リクエストボディ**:
```json
{ "video_ids": [1, 2, 3, 4] }
```

**副作用**:
- `subprocess.Popen([avp_exe_path, ...paths])` で FastAPI 実行マシン上の AVP を起動する。
- Streamlit 現行の AVP タブと同じく、AVP 起動自体では `viewing_history` / `play_history` を記録しない。
- 評価・いいねは既存の `PUT /api/videos/{id}/level`・`POST /api/videos/{id}/like` を使う。

**レスポンス**: `{ "status": "success", "message": "..." }`（200 OK）

**エラーケース**:
- 400: `video_ids` が0件、5件以上、正でないID、重複ID。
- 404: 指定動画が存在しない、または動画ファイルが存在しない。
- 409: `is_available=false` の動画が含まれる。
- 500: `avp_exe_path` 未設定・AVP 実行ファイル不存在・AVP 起動失敗。

**現行対応関数**: `ui/avp_tab.py` の `_launch_avp()`。API 実装は `api/avp.py` から `app_service.load_user_config()` /
`app_service.get_videos_by_ids()` を呼ぶ。

---

## 3. いいね

### POST /api/videos/{id}/like
**説明**: 動画にいいねを1件追加し、更新後のいいね数を返す。

**レスポンス**: `{ "video_id": 123, "like_count": 5 }`（200 OK）

**現行対応関数**: `app_service.add_like(video_id)` → `like_service.add_like()`。

---

### GET /api/likes
**説明**: 複数動画のいいね数を一括取得する。

**クエリパラメータ**: `video_ids`: int[]（例 `1,2,3`）。

**レスポンス**: `{ "1": 5, "2": 0, "3": 12 }`（200 OK。いいねなしは 0）。

**現行対応関数**: `app_service.get_like_counts(video_ids)` → `like_service.get_like_counts()`。

---

## 4. 統計・分析

### GET /api/stats/kpi
**説明**: Tier1 用 KPI（未判定数・判定済み数・判定率・本日の判定数）を返す。

**レスポンス**（200 OK）:
```json
{ "unrated_count": 120, "judged_count": 880, "judged_rate": 0.88, "today_judged_count": 5 }
```

**現行対応関数**: `app_service.get_kpi_stats()` → `core/analysis_service.py:get_kpi_stats()`（Phase 3-B で core へ移設済み）。
Streamlit 側キャッシュは `ui/cache.py:get_kpi_stats_cached()`。

---

### GET /api/stats/selection-kpi
**説明**: Tier2 用 KPI（未選別数・判定済み数・判定率・本日の判定数）を返す。

**クエリパラメータ**: `folder`: str（省略時は config の `selection_folder`。両方未設定なら全体セレクション KPI を返す）。

**レスポンス**（200 OK）:
```json
{ "unselected_count": 40, "judged_count": 160, "judged_rate": 0.8, "today_judged_count": 3 }
```

**現行対応関数**: `app_service.get_selection_kpi(folder_path)` → `selection_service.get_selection_kpi()`。

---

### GET /api/stats/view-counts
**説明**: 全動画の視聴回数マップを返す（カード表示・ソート用）。

**レスポンス**: `{ "1": 3, "2": 10, ... }`（video_id → view_count、200 OK）

**現行対応関数**: `database.get_view_counts_map()`（現状 `ui/cache.py:get_view_counts_and_last_viewed()`）。

---

### GET /api/stats/last-viewed
**説明**: 全動画の最終視聴日時マップを返す。

**レスポンス**: `{ "1": "2026-05-01T12:00:00", ... }`（video_id → last_viewed_at、200 OK）

**現行対応関数**: `database.get_last_viewed_map()`。

---

### GET /api/ranking
**説明**: ランキングタブ用。種別・期間・条件でランク付けした動画と各スコアを返す。

**クエリパラメータ**:
- `type`: str — `view_count` | `view_days` | `likes` | `composite`。
- `period`: str — `180日` | `1年` | `全期間`（period_label）。
- `min_level`: int — 最低レベル（省略時: 制限なし。例: Lv3+ なら 3）。
- `availability`: str — `利用可能のみ` 等（デフォルト `利用可能のみ`）。
- `top_n`: int — 表示件数（デフォルト 10）。

**レスポンス**（200 OK）:
```json
{ "items": [ { "rank": 1, "video": Video, "score": 42 } ] }
```

**現行対応関数**: `app_service.get_ranked_videos_for_tab(ranking_type, period_label, min_level, availability_filter, top_n)`。

---

### GET /api/analysis/data
**説明**: 分析ダッシュボードの基礎データ（動画 + 累積視聴回数）を期間・スコープ条件で返す。

**クエリパラメータ**:
- `period`: str — `全期間` | `直近7日` | `直近30日` | `直近90日` | `直近180日` | `カスタム`。
- `start` / `end`: date — `period=カスタム` のときの範囲。
- `availability`: str — `利用可能のみ` | `利用不可のみ` | `すべて`。
- `include_deleted`: bool。

**レスポンス**（200 OK）: `{ "items": [ …動画ごとの集計レコード(snake_case)… ], "total": int }`
（`items` の各レコードは `Video` の全フィールド + `total_view_count` / `last_viewed_at` / `period_view_count`）。

**現行対応関数**: `app_service.load_analysis_data()` + `convert_period_filter()` + `apply_scope_filter()` + `calculate_period_view_count()`。

---

### GET /api/analysis/viewing-history
**説明**: 指定期間・動画群の視聴履歴を返す（視聴トレンド用）。

**クエリパラメータ**: `start` / `end`: datetime, `video_ids`: int[]。

**レスポンス**: `[ { "video_id": 1, "viewed_at": "..." } ]`（200 OK）

**現行対応関数**: `app_service.get_viewing_history(period_start, period_end, video_ids)`。

---

### GET /api/analysis/judgment-history
**説明**: 指定期間・動画群の判定履歴を返す（生データ取得用。トレンド表示は trend エンドポイントを推奨）。

**クエリパラメータ**: `start` / `end`: datetime, `video_ids`: int[]。

**レスポンス**: `[ { "video_id": 1, "judged_at": "..." } ]`（200 OK）

**現行対応関数**: `app_service.get_judgment_history(period_start, period_end, video_ids)`。

---

### GET /api/analysis/viewing-trend / GET /api/analysis/judgment-trend
**説明**: 視聴/判定トレンドを**サーバー側でバケット集計**して返す。フロントは `video_ids` を送らない
（旧 `viewing-history`/`judgment-history` を全 ID で chunk 取得する方式の URL 長超過・リクエスト爆発を回避）。

**クエリパラメータ**: `period` / `start` / `end` / `availability`（`利用可能のみ`|`利用不可のみ`|`すべて`）/
`include_deleted`: bool / `bucket`: `day` | `week` | `month`。

**レスポンス**: `[ { "label": "2026-06-08", "count": 12 } ]`（200 OK）
- `label`: day=`YYYY-MM-DD` / week=月曜開始日(`YYYY-MM-DD`) / month=`YYYY-MM`（selection-trend と書式統一）。
- viewing は `COUNT(*)`、judgment は **バケットごとに `COUNT(DISTINCT video_id)`**（週/月でも同一動画は1カウント）。

**実装**: `viewing_history`/`judgment_history` × `videos` を JOIN した SQL 集計（`app_service.get_viewing_trend` /
`get_judgment_trend`）。`availability` は `videos.is_available`、`include_deleted=false` は `is_deleted=0` に写像。

---

### GET /api/analysis/response-time
**説明**: 判定の応答時間データ（ヒストグラム用）を返す。

**レスポンス**: `[ { "duration_ms": 1200, "storage": "C_DRIVE" } ]`（200 OK）

**現行対応関数**: `app_service.get_response_time_data()`。

---

### GET /api/analysis/rankings
**説明**: 分析ダッシュボード内の3種ランキング（視聴回数・視聴日数・いいね）を返す。

**クエリパラメータ**: `kind`: str — `view_count` | `view_days` | `likes`, `top_n`: int（デフォルト 50）、
および `/api/analysis/data` と同じ期間・スコープ条件。

**レスポンス**（snake_case に正規化・**フラット型付き**。現行 DataFrame の日本語列名は使わない）:
```json
{
  "kind": "view_count",
  "items": [
    { "rank": 1, "filename": "###_sample.mp4", "is_available": true,
      "storage_location": "EXTERNAL_HDD", "file_created_at": "2025-12-01", "favorite_level": 3, "score": 42 }
  ]
}
```
`score` は `kind`（`view_count`=視聴回数 / `view_days`=視聴日数 / `likes`=いいね数）に対応する。
`is_available` は `true`/`false`/`null`、`file_created_at` は `YYYY-MM-DD` または `null`。
カード系の `/api/ranking` と異なり**動画はネストせずフラット**に返す。

**現行対応関数**: `app_service.get_view_count_ranking()` / `get_view_days_ranking()` / `get_like_count_ranking()`。

---

### GET /api/analysis/selection-trend
**説明**: セレクション判定の日次件数トレンドを返す。

**クエリパラメータ**: `start` / `end`: datetime。

**レスポンス**: `[ { "date": "2026-05-01", "count": 3 } ]`（200 OK）

**現行対応関数**: `app_service.get_selection_judgment_trend(period_start, period_end)`。

---

### GET /api/analysis/selection-distribution
**説明**: セレクション判定結果のレベル分布を返す。

**レスポンス**: `[ { "level": 3, "count": 20 } ]`（200 OK）

**現行対応関数**: `app_service.get_selection_level_distribution()`。

---

## 5. スキャン・設定

### POST /api/scan/library
**説明**: ライブラリ全体をスキャンして DB を更新する。

**リクエストボディ**: なし。**保存済み config の `library_roots` からサーバ側で scanner を構築**する
（HTTP からは scanner オブジェクトを渡せないため）。

**副作用**: スキャンで見つからなかった全動画を `is_available=0` に更新する
（全ドライブ未接続でスキャン0件の場合のみスキップ。`core/scanner.py` の安全ガード）。

**レスポンス**: `{ "status": "success", "message": "..." }`（200 OK）

**現行対応関数**: `app_service.create_file_scanner()` + `app_service.scan_and_update_with_connection(scanner)`。

---

### POST /api/scan/selection
**説明**: 単一のセレクションフォルダのみをスキャンする（横断的な `is_available` 更新はしない）。

**リクエストボディ**:
```json
{ "folder": "D:/selection" }
```
- `folder`: str — 省略時は config の `selection_folder` を使用する。**両方未設定なら 400**（走査対象が無いため）。

**レスポンス**: `{ "status": "success", "message": "...", "found_count": 12 }`（200 OK）

**現行対応関数**: `app_service.scan_selection_folder(folder_path)` → `selection_service.scan_selection_folder()`。

---

### GET /api/config
**説明**: ユーザー設定を返す。

**レスポンス**（200 OK）:
```json
{ "library_roots": ["C:/videos", "D:/videos"], "default_player": "...", "avp_exe_path": "...", "db_path": "...", "selection_folder": "D:/selection" }
```

**現行対応関数**: `app_service.load_user_config()` → `config_utils.load_user_config()`。

---

### PUT /api/config
**説明**: ユーザー設定を保存する。

**リクエストボディ**: 設定 dict（`library_roots` / `default_player` / `avp_exe_path` / `db_path` / `selection_folder`）。

**レスポンス**: `{ "status": "success" }`（200 OK）

**現行対応関数**: `app_service.save_user_config(config)` → `config_utils.save_user_config()`。

---

## 6. DB バックアップ

### POST /api/backup
**説明**: SQLite DB のバックアップを作成する。

**レスポンス**（200 OK）:
```json
{ "status": "success", "message": "...", "filename": "videos_20260603.db", "size_bytes": 1048576 }
```

**エラーケース**: 500 バックアップ失敗（`status: error`）。

**現行対応関数**: `database.create_backup()`（**移行時に app_service へ wrapper 追加が前提**）。

---

## AVP（並列再生）

AVP 再生は Phase 4-C で FastAPI + Next.js に移植済み。API は起動処理のみを担当し、最大4本の選択中ID・
再生対象ID・評価待ちIDは Next.js 側の Zustand 状態で管理する。起動先は通常再生と同じく FastAPI 実行マシン。

---

## 運用エンドポイント（dev only）: Runtime

開発時に Streamlit / FastAPI / Next.js の起動状態を Next.js サイドバーに lamp 表示し、各サービスを停止するための
コントロール。ドメイン API ではなく**開発・運用補助**。**既定では無効**で、`CLIPBOX_ENABLE_RUNTIME_CONTROL=1` で
FastAPI を起動したときのみ公開される（未設定時は `/api/runtime*` が 404）。実装は `api/runtime.py` →
`core/runtime_control.py`（`psutil` でポート 8501/8000/3000 の LISTEN プロセス→PID を判定）。
**停止対象は cwd がリポジトリ配下 AND cmdline にサービス固有マーカーを満たす ClipBox プロセスに限定**
（`uvicorn --reload` の子/親構成にも対応）。使い方は `docs/runtime-controls.md` を参照。

### GET /api/runtime
**説明**: 全サービスの状態を返す。

**レスポンス**（200 OK）:
```json
{ "services": [ { "name": "streamlit", "label": "Streamlit", "port": 8501, "status": "running", "pid": 1234 } ] }
```
- `status`: `running`（緑）/ `stopped`（灰）/ `unknown`（黄）。

### POST /api/runtime/{service}/stop
**説明**: 指定サービス（`streamlit` / `fastapi` / `nextjs`）のプロセスを停止する（terminate→timeout 後 kill）。

**レスポンス**: `{ "status": "success", "message": "..." }`（200 OK）

**エラーケース**:
- 404: 未知のサービス名（または runtime control 無効）。
- **409: ポート占有元を ClipBox として確認できず停止しない**（誤停止防止）。
- 500: 停止に失敗。

### POST /api/runtime/web-stack/stop
**説明**: Web スタック（**Next.js → FastAPI の順**）を一括停止する。FastAPI は本 API の実行主体のため、停止すると
API も落ちる。フロントは応答を待たず `about:blank` に遷移する。

**レスポンス/エラー**: 個別停止と同じ（success→200 / blocked→409 / error→500）。ただし FastAPI 自己終了により応答は届かないことがある。

**注意**: `web-stack`（および `nextjs`）を停止すると操作中の画面も終了する。
