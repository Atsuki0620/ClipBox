# 移行マップ（Streamlit → FastAPI + Next.js）

現行 Streamlit UI 関数 / 処理と、FastAPI エンドポイントの対応表。
「現行のどの関数が、将来のどの API 呼び出しに置き換わるか」を画面単位で示す。

> **境界に関する注記**
> `VideoManager.xxx` / `database.xxx` の多くは現状 `core/app_service.py` に未公開。移行時に
> app_service へ薄い wrapper を追加し、FastAPI は app_service 経由で呼ぶ（詳細は `API_SPEC.md` 参照）。
> 表の API 列はファサード越しの最終的な HTTP 呼び出しを示す。

---

## Tier 1 ライブラリ（`ui/library_tab.py`）

| 現行 Streamlit 関数 / 処理 | FastAPI 呼び出し |
|---|---|
| `VideoManager.get_videos(favorite_levels, ...)` | `GET /api/videos?levels=...`（performers フィルタは廃止） |
| キーワード検索（title 部分一致） | `GET /api/videos?...`（または `GET /api/videos/search`） |
| `ui_cache.get_filter_options()` | `GET /api/filter-options`（備考: HTTP キャッシュ / フロント state へ） |
| `ui_cache.get_view_counts_and_last_viewed()` | `GET /api/stats/view-counts` + `GET /api/stats/last-viewed`（備考: フロント state へ） |
| `VideoManager.play_video(video_id)` | `POST /api/videos/{id}/play` |
| `app_service.set_favorite_level_with_rename(id, level)` | `PUT /api/videos/{id}/level` |
| `app_service.get_like_counts(video_ids)` | `GET /api/likes?video_ids=...` |
| `app_service.add_like(video_id)` | `POST /api/videos/{id}/like` |

---

## Tier 1 ランダム / 運命の1本（`ui/unrated_random_tab.py`）

| 現行 Streamlit 関数 / 処理 | FastAPI 呼び出し |
|---|---|
| `VideoManager.get_unrated_random_videos(n)` | `GET /api/videos/unrated/random?n=...` |
| `VideoManager.get_unrated_fate_video()` | `GET /api/videos/unrated/fate` |
| `VideoManager.get_videos_by_ids(ids)`（DB同期） | `GET /api/videos/{id}`（複数なら順次/一括） |
| `app_service.add_like` / `get_like_counts` | `POST /api/videos/{id}/like` / `GET /api/likes` |
| `ui_cache.get_view_counts_and_last_viewed()` | `GET /api/stats/view-counts` + `/last-viewed` |
| `ui_cache.get_kpi_stats_cached()` | `GET /api/stats/kpi`（備考: フロント側でキャッシュ） |

---

## Tier 1 シェル / KPI（`ui/tier1_tab.py`）

| 現行 Streamlit 関数 / 処理 | FastAPI 呼び出し |
|---|---|
| `ui_cache.get_kpi_stats_cached()` | `GET /api/stats/kpi`（現状 `ui/components/kpi_display.py` → core 移設前提） |
| サブタブ（ライブラリ/ランダム/運命の1本）への委譲 | フロント側ルーティング（API なし） |

---

## Tier 2 ライブラリ / ランダム / 運命の1本（`ui/selection_tab.py`, `ui/tier2_tab.py`）

| 現行 Streamlit 関数 / 処理 | FastAPI 呼び出し |
|---|---|
| `VideoManager.get_videos(needs_selection_filter=None/True/False)` + フォルダ絞り込み | `GET /api/videos/selection?folder=...&status=all\|unselected\|completed` |
| ランダム表示（`random.sample`） | （API なし。一覧結果をフロント側で sample） |
| `VideoManager.get_fate_video(folder_path_str)` | `GET /api/videos/selection/fate?folder=...` |
| `VideoManager.get_videos_by_ids(ids)` | `GET /api/videos/{id}` |
| `app_service.get_selection_kpi(folder)` | `GET /api/stats/selection-kpi?folder=...` |
| `play_video` / `set_favorite_level_with_rename` | `POST /api/videos/{id}/play` / `PUT /api/videos/{id}/level` |
| `add_like` / `get_like_counts` | `POST /api/videos/{id}/like` / `GET /api/likes` |
| `ui_cache.get_view_counts_and_last_viewed()` | `GET /api/stats/view-counts` + `/last-viewed` |

---

## ランキング（`ui/ranking_tab.py`）

| 現行 Streamlit 関数 / 処理 | FastAPI 呼び出し |
|---|---|
| `app_service.get_ranked_videos_for_tab(type, period, min_level, availability, top_n)` | `GET /api/ranking?type=...&period=...&min_level=...&top_n=...` |
| `app_service.get_like_counts` / `add_like` | `GET /api/likes` / `POST /api/videos/{id}/like` |
| `play_video` / `set_favorite_level_with_rename` | `POST /api/videos/{id}/play` / `PUT /api/videos/{id}/level` |
| `ui_cache.get_view_counts_and_last_viewed()` | `GET /api/stats/view-counts` + `/last-viewed` |

---

## 分析ダッシュボード（`ui/analysis_tab.py`）

| 現行 Streamlit 関数 / 処理 | FastAPI 呼び出し |
|---|---|
| `app_service.load_analysis_data()` + `convert_period_filter()` + `apply_scope_filter()` + `calculate_period_view_count()` | `GET /api/analysis/data?period=...&availability=...` |
| `app_service.get_viewing_history(...)` | `GET /api/analysis/viewing-history?start=...&end=...&video_ids=...` |
| `app_service.get_judgment_history(...)` | `GET /api/analysis/judgment-history?...` |
| `app_service.get_response_time_data()` | `GET /api/analysis/response-time` |
| `get_view_count_ranking` / `get_view_days_ranking` / `get_like_count_ranking` | `GET /api/analysis/rankings?kind=...&top_n=...` |
| `app_service.get_selection_judgment_trend(...)` | `GET /api/analysis/selection-trend?start=...&end=...` |
| `app_service.get_selection_level_distribution()` | `GET /api/analysis/selection-distribution` |
| `_load_cached_analysis_data()`（10分キャッシュ） | （備考: HTTP キャッシュ / フロント側キャッシュへ） |

---

## 検索（`ui/search_tab.py`）

| 現行 Streamlit 関数 / 処理 | FastAPI 呼び出し |
|---|---|
| `VideoManager.get_videos(storage_locations=...)` + `normalize_text` 絞り込み | `GET /api/videos/search?keyword=...&storage=...` |
| `add_like` / `get_like_counts` | `POST /api/videos/{id}/like` / `GET /api/likes` |
| `play_video` / `set_favorite_level_with_rename` | `POST /api/videos/{id}/play` / `PUT /api/videos/{id}/level` |
| `ui_cache.get_view_counts_and_last_viewed()` | `GET /api/stats/view-counts` + `/last-viewed` |

---

## AVP 再生（`ui/avp_tab.py`）

| 現行 Streamlit 関数 / 処理 | FastAPI / Next.js での対応 |
|---|---|
| `st.session_state.avp_selected_ids`（選択中ID管理、最大4本） | Zustand `avpSelectedIds`（`frontend/src/lib/store.ts`） |
| `st.session_state.avp_launch_selected`（再生対象ID） | Zustand `avpLaunchSelectedIds` |
| `st.session_state.avp_playing_ids`（評価待ちID） | Zustand `avpPlayingIds` |
| `subprocess.Popen(AVP.exe, ...)` で並列起動 | `POST /api/avp/play` |
| `VideoManager.get_videos()`（選択リスト取得） | `GET /api/videos/{id}`（選択IDごとに再取得） |
| `add_like` / `get_like_counts` | `GET /api/likes` / `POST /api/videos/{id}/like` |
| 評価カードでの判定 | `PUT /api/videos/{id}/level` |

---

## 設定（`ui/extra_tabs.py`）

| 現行 Streamlit 関数 / 処理 | FastAPI 呼び出し |
|---|---|
| `app_service.load_user_config()` | `GET /api/config` |
| `app_service.save_user_config(config)` | `PUT /api/config` |
| `app_service.scan_selection_folder(folder)` | `POST /api/scan/selection`（body: `folder`） |

---

## アプリシェル / ハンドラ（`streamlit_app.py`）

| 現行 Streamlit 関数 / 処理 | FastAPI 呼び出し |
|---|---|
| `app_service.check_database_exists()` / `init_database()` | サーバ起動時処理（API なし、または `GET /api/health`） |
| `app_service.run_startup_migration()` | サーバ起動時処理（API なし） |
| `app_service.create_video_manager()` | （FastAPI 内部でファサード経由） |
| `app_service.detect_library_root(file_path, active_roots)` | `POST /api/videos/{id}/play` のサーバ側内部処理 |
| `app_service.create_file_scanner()` + `scan_and_update_with_connection()` | `POST /api/scan/library`（config の library_roots を使用） |
| `app_service.scan_selection_folder()` | `POST /api/scan/selection` |
| `app_service.save_user_config()` | `PUT /api/config` |
| `app_service.set_favorite_level_with_rename()` | `PUT /api/videos/{id}/level` |
| `database.create_backup()` | `POST /api/backup` |
| `ui_cache.*.clear()`（データ変更後のキャッシュクリア） | （備考: API では不要。フロント側で再フェッチ / HTTP キャッシュ無効化） |

---

## キャッシュ層（`ui/cache.py`）

`@st.cache_data` 関数は HTTP レイヤ / フロント state へ置き換える。

| 現行キャッシュ関数 | ラップ対象 | 移行後 |
|---|---|---|
| `get_filter_options()`（ttl 30s） | `database.get_distinct_favorite_levels/storage_locations()`（performers 廃止） | `GET /api/filter-options` |
| `get_view_counts_and_last_viewed()`（ttl 10s） | `database.get_view_counts_map/get_last_viewed_map()` | `GET /api/stats/view-counts` + `/last-viewed` |
| `get_metrics()`（ttl 30s） | `database.get_total_videos_count/get_total_views_count()` | `GET /api/stats/kpi` に統合 or 専用 API |
| `get_kpi_stats_cached()`（ttl 10s） | `ui/components/kpi_display.py:get_kpi_stats()` | `GET /api/stats/kpi`（core 移設前提） |
