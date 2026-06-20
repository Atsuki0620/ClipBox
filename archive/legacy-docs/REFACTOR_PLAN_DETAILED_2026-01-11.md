# ClipBox リファクタリング詳細作業計画書

**作成日**: 2026-01-11  
**対象**: `streamlit_app.py`（現在873行）の薄層化  
**目標**: UI層を300行以下に削減し、レイヤー分離原則を徹底

---

## 📋 目次

1. [現状分析](#1-現状分析)
2. [目標状態](#2-目標状態)
3. [Phase 1: ビジネスロジックの移動](#phase-1-ビジネスロジックの移動)
4. [Phase 2: DBクエリの集約](#phase-2-dbクエリの集約)
5. [Phase 3: ソート・表示ロジックの抽出](#phase-3-ソート表示ロジックの抽出)
6. [Phase 4: render関数の分割・整頓](#phase-4-render関数の分割整頓)
7. [動作確認手順](#動作確認手順)
8. [リスクと回避策](#リスクと回避策)

---

## 1. 現状分析

### 📊 問題の定量化

| 指標 | 現状 | 目標 |
|------|------|------|
| streamlit_app.py 行数 | 873行 | 300行以下 |
| UI層内のビジネスロジック | 多数存在 | ゼロ |
| UI層からの直接DBクエリ | 3箇所以上 | ゼロ |
| 関数の平均行数 | 約80行 | 30行以下 |

### 🚨 主な問題点

#### 問題1: ビジネスロジックがUI層に混在
- **`_handle_judgment()`** (91-132行): ファイル名生成、Path操作、リネーム処理
- **`_normalize_text()`** (174-185行): テキスト正規化ロジック
- **`is_judged()`** (187-199行): 判定済み判別ロジック
- **`_detect_library_root()`** (52-63行): ライブラリルート判定

#### 問題2: DBクエリがUI層に直接存在
- **`get_filter_options()`** (268-287行): 3つのSELECT文
- **`render_video_list()`** (380-387行): viewing_history集計クエリ

#### 問題3: 複雑なソートロジックがUI内に存在
- **`render_video_list()._sort_key()`** (406-443行): 40行近いソートキー生成

#### 問題4: render関数の肥大化
- **`render_video_list()`**: 約210行（389-589行）
- **`main()`**: 約120行（735-873行）

---

## 2. 目標状態

### 🎯 リファクタリング後の構造

```
streamlit_app.py (300行以下)
├── UI状態管理 (session_state)
├── レイアウト配置
├── イベントハンドラ（薄い配線のみ）
└── メッセージ表示

core/models.py (純粋関数追加)
├── normalize_text()
├── is_judged()
├── create_sort_key()
└── build_display_name()

core/video_manager.py (ビジネスロジック追加)
├── set_favorite_level_with_rename()
└── (既存メソッド)

core/app_service.py (UI入口集約)
├── get_filter_options()
├── get_view_counts_and_last_viewed()
├── detect_library_root()
└── (既存関数の再エクスポート)

core/file_ops.py (ファイル操作追加)
└── rename_video_file()
```

### ✅ 成功基準

- [ ] streamlit_app.py が300行以下
- [ ] UI層からの直接DBクエリがゼロ
- [ ] UI層にビジネスロジックが存在しない
- [ ] すべての関数が30行以下（render系を除く）
- [ ] 既存の動作が100%維持される

---

## Phase 1: ビジネスロジックの移動

**期間**: 1-2時間  
**目標**: UI層から純粋関数とビジネスロジックを`core/`へ移動

### 📝 作業チェックリスト

#### タスク1.1: テキスト正規化の移動

- [ ] `core/models.py`に`normalize_text()`を追加
  ```python
  def normalize_text(text: str) -> str:
      """全角/半角・大小・カナ差を吸収した簡易正規化"""
      if text is None:
          return ""
      import unicodedata
      norm = unicodedata.normalize("NFKC", text).lower()
      result_chars = []
      for ch in norm:
          code = ord(ch)
          if 0x30a1 <= code <= 0x30f6:
              result_chars.append(chr(code - 0x60))
          else:
              result_chars.append(ch)
      return "".join(result_chars)
  ```
- [ ] `streamlit_app.py`の`_normalize_text()`を削除
- [ ] すべての呼び出し箇所を`from core.models import normalize_text`に変更
- [ ] 動作確認: タイトル検索が正常動作

#### タスク1.2: 判定済み判別の移動

- [ ] `core/models.py`に`is_judged()`を追加（Videoクラスのメソッドとして）
  ```python
  # Video dataclass内に追加
  def is_judged(self) -> bool:
      """判定済みかどうかを判別（プレフィックスの有無で判定）"""
      from pathlib import Path
      filename = Path(self.current_full_path).name
      return filename != self.essential_filename
  ```
- [ ] `streamlit_app.py`の`is_judged()`関数を削除
- [ ] 呼び出し箇所を`video.is_judged()`に変更
- [ ] 動作確認: 未判定バッジが正常表示

#### タスク1.3: ライブラリルート判定の移動

- [ ] `core/app_service.py`に`detect_library_root()`を追加
  ```python
  def detect_library_root(file_path: Path, active_roots: list) -> str:
      """SCAN_DIRECTORIESのどれに属するかを判定"""
      for root in active_roots:
          root_path = Path(root)
          try:
              Path(file_path).resolve().relative_to(root_path.resolve())
              return str(root_path)
          except ValueError:
              continue
      return ""
  ```
- [ ] `streamlit_app.py`の`_detect_library_root()`を削除
- [ ] 呼び出し箇所を`app_service.detect_library_root()`に変更
- [ ] 動作確認: 再生履歴のlibrary_rootが正常記録

#### タスク1.4: 判定処理の移動（最重要）

- [ ] `core/video_manager.py`に`set_favorite_level_with_rename()`を追加
  ```python
  def set_favorite_level_with_rename(self, video_id: int, new_level: int | None) -> Dict[str, str]:
      """
      お気に入りレベルを変更し、ファイルをリネーム
      
      Args:
          video_id: 対象動画のID
          new_level: None=未判定, 0=レベル0, 1-4=レベル1-4
          
      Returns:
          Dict: {'status': 'success'|'error', 'message': '...'}
      """
      with get_db_connection() as conn:
          row = conn.execute("SELECT * FROM videos WHERE id = ?", (video_id,)).fetchone()
          if not row:
              return {'status': 'error', 'message': '動画が見つかりません'}
          
          video = self._row_to_video(row)
          
          # ファイル名生成
          if new_level is None:
              new_filename = video.essential_filename
              db_level = 0
          elif new_level == 0:
              new_filename = f"_{video.essential_filename}"
              db_level = 0
          else:
              prefix = "#" * new_level
              new_filename = f"{prefix}_{video.essential_filename}"
              db_level = new_level
          
          # リネーム実行
          from pathlib import Path
          current_path = Path(video.current_full_path)
          new_path = current_path.with_name(new_filename)
          
          try:
              if new_path != current_path:
                  current_path.rename(new_path)
              
              # DB更新
              conn.execute(
                  """
                  UPDATE videos
                     SET current_full_path = ?,
                         current_favorite_level = ?,
                         last_scanned_at = CURRENT_TIMESTAMP
                   WHERE id = ?
                  """,
                  (str(new_path), db_level, video_id),
              )
              
              level_name = "未判定" if new_level is None else f"レベル{new_level}"
              return {'status': 'success', 'message': f'判定完了: {level_name}'}
              
          except FileNotFoundError:
              return {'status': 'error', 'message': 'ファイルが見つかりません'}
          except PermissionError:
              return {'status': 'error', 'message': 'ファイルが使用中、またはアクセス権がありません'}
          except Exception as e:
              return {'status': 'error', 'message': f'リネームに失敗しました: {e}'}
  ```
- [ ] `core/app_service.py`に`set_favorite_level_with_rename()`を追加（再エクスポート）
  ```python
  def set_favorite_level_with_rename(video_id: int, new_level: int | None) -> Dict[str, str]:
      """お気に入りレベル変更（VideoManager経由）"""
      video_manager = create_video_manager()
      return video_manager.set_favorite_level_with_rename(video_id, new_level)
  ```
- [ ] `streamlit_app.py`の`_handle_judgment()`を以下に置き換え
  ```python
  def _handle_judgment(video, new_level):
      """判定処理の薄いラッパー"""
      result = app_service.set_favorite_level_with_rename(video.id, new_level)
      
      if result.get("status") == "success":
          st.success(result.get("message"))
          st.rerun()
      else:
          st.error(result.get("message"))
  ```
- [ ] 動作確認: 判定ボタンでレベル変更＋リネームが正常動作

#### タスク1.5: バッジ生成の移動

- [ ] `core/models.py`に`create_badge()`を追加
  ```python
  def create_badge(label: str, color: str) -> str:
      """HTMLバッジを生成"""
      return (
          f'<span class="cb-badge" style="background:{color}; '
          f'padding:4px 4px; margin:0 2px 2px 0; border-radius:6px; '
          f'font-size:0.85em; box-shadow:0 1px 3px rgba(0,0,0,0.2); '
          f'display:inline-block; color:white; font-weight:500;">{label}</span>'
      )
  ```
- [ ] `streamlit_app.py`の`_badge()`を削除
- [ ] 呼び出し箇所を`from core.models import create_badge`に変更
- [ ] 動作確認: バッジ表示が正常

#### タスク1.6: レベル表示変換の移動

- [ ] `core/models.py`に`level_to_display()`を追加
  ```python
  def level_to_display(level: int) -> str:
      """お気に入りレベルを表示用テキストに変換"""
      level = max(0, min(4, level))
      return f"Lv{level}"
  ```
- [ ] `streamlit_app.py`の`_level_to_star()`を削除
- [ ] 呼び出し箇所を`from core.models import level_to_display`に変更
- [ ] 動作確認: レベルバッジが正常表示

### ✅ Phase 1 完了条件

- [ ] `streamlit_app.py`から以下の関数が削除されている
  - `_normalize_text()`
  - `is_judged()`
  - `_detect_library_root()`
  - `_handle_judgment()`（内部ロジックは移動、薄いラッパーのみ残存）
  - `_badge()`
  - `_level_to_star()`
- [ ] すべての動作確認が完了
- [ ] 行数が約100行削減（873行 → 約770行）

---

## Phase 2: DBクエリの集約

**期間**: 1-2時間  
**目標**: UI層からの直接DBクエリをゼロにし、`core/app_service.py`経由に統一

### 📝 作業チェックリスト

#### タスク2.1: フィルタオプション取得の移動

- [ ] `core/database.py`に以下を追加
  ```python
  def get_distinct_favorite_levels(conn) -> list[int]:
      """お気に入りレベルの一覧を取得"""
      cursor = conn.execute(
          "SELECT DISTINCT current_favorite_level FROM videos ORDER BY current_favorite_level DESC"
      )
      return [row[0] for row in cursor.fetchall()]
  
  def get_distinct_performers(conn) -> list[str]:
      """登場人物の一覧を取得"""
      cursor = conn.execute(
          "SELECT DISTINCT performer FROM videos WHERE performer IS NOT NULL ORDER BY performer"
      )
      return [row[0] for row in cursor.fetchall()]
  
  def get_distinct_storage_locations(conn) -> list[str]:
      """保存場所の一覧を取得"""
      cursor = conn.execute(
          "SELECT DISTINCT storage_location FROM videos ORDER BY storage_location"
      )
      return [row[0] for row in cursor.fetchall()]
  ```
- [ ] `core/app_service.py`に以下を追加
  ```python
  def get_filter_options() -> tuple[list[int], list[str], list[str]]:
      """フィルタオプションを取得（お気に入り、登場人物、保存場所）"""
      from core import database
      with get_db_connection() as conn:
          favorite_levels = database.get_distinct_favorite_levels(conn)
          performers = database.get_distinct_performers(conn)
          storage_locations = database.get_distinct_storage_locations(conn)
      return favorite_levels, performers, storage_locations
  ```
- [ ] `streamlit_app.py`の`get_filter_options()`を削除
- [ ] `render_sidebar()`内の呼び出しを`app_service.get_filter_options()`に変更
- [ ] 動作確認: サイドバーのフィルタオプションが正常表示

#### タスク2.2: 視聴統計取得の移動

- [ ] `core/database.py`に以下を追加
  ```python
  def get_view_counts_map(conn) -> dict[int, int]:
      """動画IDごとの視聴回数マップを取得"""
      rows = conn.execute(
          "SELECT video_id, COUNT(*) AS cnt FROM viewing_history GROUP BY video_id"
      ).fetchall()
      return {row["video_id"]: row["cnt"] for row in rows}
  
  def get_last_viewed_map(conn) -> dict[int, str]:
      """動画IDごとの最終視聴日時マップを取得"""
      rows = conn.execute(
          "SELECT video_id, MAX(viewed_at) AS last_viewed FROM viewing_history GROUP BY video_id"
      ).fetchall()
      return {row["video_id"]: row["last_viewed"] for row in rows}
  ```
- [ ] `core/app_service.py`に以下を追加
  ```python
  def get_view_counts_and_last_viewed() -> tuple[dict, dict]:
      """視聴回数と最終視聴日時のマップを返す"""
      from core import database
      with get_db_connection() as conn:
          view_counts = database.get_view_counts_map(conn)
          last_viewed = database.get_last_viewed_map(conn)
      return view_counts, last_viewed
  ```
- [ ] `streamlit_app.py`の`render_video_list()`内のDBクエリを削除
- [ ] 代わりに`view_counts, last_viewed_map = app_service.get_view_counts_and_last_viewed()`を呼び出し
- [ ] 動作確認: 視聴回数バッジが正常表示

#### タスク2.3: メトリクス取得の移動

- [ ] `core/database.py`に以下を追加
  ```python
  def get_total_videos_count(conn) -> int:
      """総動画数を取得"""
      cursor = conn.execute("SELECT COUNT(*) FROM videos")
      return cursor.fetchone()[0]
  
  def get_total_views_count(conn) -> int:
      """総視聴回数を取得"""
      cursor = conn.execute("SELECT COUNT(*) FROM viewing_history")
      return cursor.fetchone()[0]
  ```
- [ ] `core/app_service.py`に以下を追加
  ```python
  def get_metrics() -> tuple[int, int]:
      """総動画数と総視聴回数を返す"""
      from core import database
      with get_db_connection() as conn:
          total_videos = database.get_total_videos_count(conn)
          total_views = database.get_total_views_count(conn)
      return total_videos, total_views
  ```
- [ ] `streamlit_app.py`の`render_sidebar()`内のDBクエリを削除
- [ ] 代わりに`total_videos, total_views = app_service.get_metrics()`を呼び出し
- [ ] 動作確認: サイドバーのメトリクスが正常表示

### ✅ Phase 2 完了条件

- [ ] `streamlit_app.py`から`with app_service.get_db_connection() as conn:`のパターンがすべて削除
- [ ] `streamlit_app.py`から直接のSQL文が消滅
- [ ] すべての動作確認が完了
- [ ] 行数が約50行削減（約770行 → 約720行）

---

## Phase 3: ソート・表示ロジックの抽出

**期間**: 1-2時間  
**目標**: ソートキー生成と表示整形ロジックを`core/models.py`へ移動

### 📝 作業チェックリスト

#### タスク3.1: ソートキー生成の移動

- [ ] `core/models.py`に以下を追加
  ```python
  from datetime import datetime
  from typing import Optional
  
  def create_sort_key(
      video,
      sort_option: str,
      view_counts: dict,
      last_viewed_map: dict
  ):
      """ソートキー生成（純粋関数）"""
      vc = view_counts.get(video.id, 0)
      lv = last_viewed_map.get(video.id)
      
      # 日時型への変換
      if isinstance(lv, str):
          try:
              lv = datetime.fromisoformat(lv)
          except Exception:
              lv = None
      
      name = normalize_text(video.essential_filename)
      
      # ファイル作成日時
      fc = video.file_created_at
      if isinstance(fc, str):
          try:
              fc = datetime.fromisoformat(fc)
          except Exception:
              fc = None
      
      # ファイル更新日時
      fm = video.last_file_modified
      if isinstance(fm, str):
          try:
              fm = datetime.fromisoformat(fm)
          except Exception:
              fm = None
      
      # ソートキーのマッピング
      sort_keys = {
          "お気に入り:高い順": (-video.current_favorite_level, video.id),
          "お気に入り:低い順": (video.current_favorite_level, video.id),
          "視聴回数:多い順": (-vc, video.id),
          "視聴回数:少ない順": (vc, video.id),
          "最終視聴:新しい順": ((-lv.timestamp()) if lv else float("inf"), video.id),
          "最終視聴:古い順": ((lv.timestamp()) if lv else float("inf"), video.id),
          "ファイル作成:新しい順": ((-fc.timestamp()) if fc else float("inf"), video.id),
          "ファイル作成:古い順": ((fc.timestamp()) if fc else float("inf"), video.id),
          "ファイル更新:新しい順": ((-fm.timestamp()) if fm else float("inf"), video.id),
          "ファイル更新:古い順": ((fm.timestamp()) if fm else float("inf"), video.id),
          "タイトル:昇順": name,
          "タイトル:降順": name[::-1],
      }
      
      return sort_keys.get(sort_option, video.id)
  ```
- [ ] `streamlit_app.py`の`render_video_list()`内の`_sort_key()`を削除
- [ ] ソート処理を以下に変更
  ```python
  from core.models import create_sort_key
  
  if sort_option:
      videos = sorted(
          videos,
          key=lambda v: create_sort_key(v, sort_option, view_counts, last_viewed_map)
      )
  ```
- [ ] 動作確認: すべてのソートオプションが正常動作

#### タスク3.2: 表示名生成の移動

- [ ] `core/models.py`の`Video`クラスに以下を追加（既存の`display_name`を上書き）
  ```python
  @property
  def display_name(self) -> str:
      """表示用のファイル名（プレフィックス付き）"""
      if self.current_favorite_level > 0:
          prefix = '#' * self.current_favorite_level + '_'
      else:
          prefix = '_'
      return f"{prefix}{self.essential_filename}"
  
  def get_truncated_title(self, max_length: int = 40) -> str:
      """指定文字数で切り詰めたタイトルを返す"""
      title = self.essential_filename
      if len(title) > max_length:
          return title[:max_length] + "..."
      return title
  ```
- [ ] `streamlit_app.py`のタイトル切り詰めロジックを`video.get_truncated_title(title_max_length)`に置き換え
- [ ] 動作確認: タイトル表示が正常

### ✅ Phase 3 完了条件

- [ ] `render_video_list()`から40行のソートロジックが削除
- [ ] タイトル切り詰めロジックがモデル層に移動
- [ ] すべての動作確認が完了
- [ ] 行数が約50行削減（約720行 → 約670行）

---

## Phase 4: render関数の分割・整頓

**期間**: 2-3時間  
**目標**: 巨大なrender関数を分割し、可読性を向上

### 📝 作業チェックリスト

#### タスク4.1: バッジ生成ロジックの関数化

- [ ] `streamlit_app.py`に以下を追加
  ```python
  def _build_badge_list(video, show_items: dict, view_count: int) -> list[str]:
      """動画情報からバッジのHTMLリストを生成"""
      from core.models import create_badge, level_to_display
      
      badges = []
      
      # 利用可否バッジ
      if show_items.get('available', True):
          if video.is_available:
              badges.append(create_badge("○", "#10b981"))
          else:
              badges.append(create_badge("×", "#ef4444"))
      
      # 未判定バッジ
      if not video.is_judged():
          badges.append(create_badge("未判定", "#f9a8d4"))
      
      # レベルバッジ
      if show_items.get('level', True) and video.is_judged():
          level_colors = {4: "#1d4ed8", 3: "#2563eb", 2: "#3b82f6", 1: "#93c5fd", 0: "#d1d5db"}
          badges.append(
              create_badge(
                  level_to_display(video.current_favorite_level),
                  level_colors.get(video.current_favorite_level, "#d1d5db")
              )
          )
      
      # 視聴回数バッジ
      if show_items.get('view_count', False):
          badges.append(create_badge(f"視聴{view_count}", "#f97316"))
      
      # 保存場所バッジ
      if show_items.get('storage', False):
          storage_short = "C" if video.storage_location == "C_DRIVE" else "HDD"
          badges.append(create_badge(storage_short, "#2563eb"))
      
      # ファイルサイズバッジ
      if show_items.get('file_size', False):
          size_short = f"{video.file_size / (1024*1024):.0f}MB" if video.file_size else "?"
          badges.append(create_badge(size_short, "#475569"))
      
      # 更新日時バッジ
      if show_items.get('updated', False):
          updated_label = "未取得"
          if video.last_file_modified:
              ts = video.last_file_modified
              if isinstance(ts, str):
                  try:
                      ts = datetime.fromisoformat(ts)
                  except Exception:
                      ts = None
              if hasattr(ts, "strftime"):
                  updated_label = ts.strftime('%Y-%m-%d %H:%M')
          badges.append(create_badge(updated_label, "#0ea5e9"))
      
      return badges
  ```
- [ ] `render_video_list()`内のバッジ生成ロジックを`_build_badge_list()`呼び出しに置き換え
- [ ] 動作確認: バッジ表示が正常

#### タスク4.2: 動画カード描画の関数化

- [ ] `streamlit_app.py`に以下を追加
  ```python
  def _render_video_card(
      video,
      col,
      view_count: int,
      show_items: dict,
      title_max_length: int
  ):
      """1件の動画カードを描画"""
      is_disabled = not video.is_available
      
      with col:
          # CSS注入（最小化）
          st.markdown("""...""", unsafe_allow_html=True)  # 既存のCSS
          
          row = st.container(border=True)
          
          # タイトル表示
          display_title = video.get_truncated_title(title_max_length)
          title_style = "" if video.is_available else ' style="opacity: 0.5; color: #9ca3af;"'
          row.markdown(
              f'<div style="margin:0;padding:1px 2px;line-height:1.1;">'
              f'<span{title_style} title="{video.essential_filename}">'
              f'<strong>{display_title}</strong></span></div>',
              unsafe_allow_html=True
          )
          
          # ボタン＋判定UI行
          btn_col, judge_col, select_col, badge_col = row.columns([1, 1, 3, 7])
          
          # 再生ボタン
          with btn_col:
              if st.button("▶️", key=f"play_{video.id}", disabled=is_disabled, help="再生"):
                  _handle_play(video, trigger="row_button")
          
          # 判定UI
          with select_col:
              judgment_options = [4, 3, 2, 1, 0, None]
              level_labels = {4: "4", 3: "3", 2: "2", 1: "1", 0: "0", None: "ー"}
              default_level = video.current_favorite_level if video.is_judged() else None
              
              selected = st.selectbox(
                  "レベル",
                  options=judgment_options,
                  format_func=lambda v: level_labels[v],
                  key=f"judge_level_{video.id}",
                  index=judgment_options.index(default_level),
                  label_visibility="collapsed",
                  disabled=is_disabled
              )
          
          with judge_col:
              if st.button("✓", key=f"judge_{video.id}", disabled=is_disabled, help="判定を確定"):
                  _handle_judgment(video, selected)
          
          # バッジ表示
          with badge_col:
              badges = _build_badge_list(video, show_items, view_count)
              if badges:
                  st.markdown(" ".join(badges), unsafe_allow_html=True)
          
          # ファイル名表示（オプション）
          if show_items.get('filename', False):
              file_name = Path(video.current_full_path).name
              row.markdown(
                  f'<div style="color: #6b7280; font-size: 0.65em; line-height: 1.0; '
                  f'margin: 1px 2px 0; padding:0;">{file_name}</div>',
                  unsafe_allow_html=True
              )
  ```
- [ ] `render_video_list()`のカード描画部分を`_render_video_card()`呼び出しに置き換え
- [ ] 動作確認: カード表示が正常

#### タスク4.3: render_video_listの簡素化

- [ ] `render_video_list()`を以下の構造に整理
  ```python
  def render_video_list(videos, sort_option=None, col_count=2, show_items=None, title_max_length=40):
      """動画一覧の描画（簡素化版）"""
      if not videos:
          st.info("条件に合う動画が見つかりませんでした。")
          return
      
      # デフォルト設定
      if show_items is None:
          show_items = {...}
      
      # 視聴統計取得
      view_counts, last_viewed_map = app_service.get_view_counts_and_last_viewed()
      
      # 選択中動画の表示
      if st.session_state.selected_video:
          current = st.session_state.selected_video
          st.success(f"直近に再生した動画: {current.essential_filename}")
      
      st.caption("タイトルまたは「▶️ 再生」をクリックすると既定のプレイヤーで再生します。")
      
      # ソート
      if sort_option:
          from core.models import create_sort_key
          videos = sorted(
              videos,
              key=lambda v: create_sort_key(v, sort_option, view_counts, last_viewed_map)
          )
      
      # グリッド描画
      col_count = int(max(1, min(6, col_count)))
      
      # CSS注入（1回のみ）
      st.markdown("""...""", unsafe_allow_html=True)
      
      # カード配置
      for i in range(0, len(videos), col_count):
          cols = st.columns(col_count, gap="small")
          for col, video in zip(cols, videos[i:i + col_count]):
              view_count = view_counts.get(video.id, 0)
              _render_video_card(video, col, view_count, show_items, title_max_length)
  ```
- [ ] 動作確認: 一覧表示が正常

#### タスク4.4: 不要なコメント・空行の削除

- [ ] すべての関数から冗長なコメントを削除
- [ ] 連続する空行を1行に統一
- [ ] 未使用のimport文を削除
- [ ] 動作確認: 全機能が正常動作

### ✅ Phase 4 完了条件

- [ ] `render_video_list()`が50行以下に削減
- [ ] すべてのrender関数が明確な責務分離
- [ ] 不要なコメント・空行が削除
- [ ] すべての動作確認が完了
- [ ] 行数が300行以下（目標達成）

---

## 動作確認手順

### 各フェーズ共通の確認項目

リファクタリング作業後、以下の操作をすべて実施し、エラーが出ないことを確認：

#### ✅ 基本動作確認

1. **起動確認**
   - [ ] `streamlit run streamlit_app.py`でエラーなく起動
   - [ ] ブラウザで`http://localhost:8501`にアクセス可能

2. **メトリクス表示確認**
   - [ ] サイドバーに「総動画数」「総視聴回数」が表示
   - [ ] 数値が正しい

3. **フィルタ動作確認**
   - [ ] お気に入りレベルのマルチセレクトが動作
   - [ ] 登場人物のマルチセレクトが動作
   - [ ] 保存場所のマルチセレクトが動作
   - [ ] 利用可否のマルチセレクトが動作

4. **一覧表示確認**
   - [ ] 動画一覧が表示される
   - [ ] タイトルが正しく表示
   - [ ] バッジ（レベル、利用可否、視聴回数等）が表示
   - [ ] 未判定バッジが正しく表示

5. **タイトル検索確認**
   - [ ] 検索ボックスに入力すると絞り込まれる
   - [ ] 全角/半角、大小文字を区別せず検索できる
   - [ ] カタカナ/ひらがなを区別せず検索できる

6. **ソート確認**
   - [ ] すべてのソートオプション（12種類）で正常にソート
   - [ ] 視聴回数順、最終視聴順、タイトル順など

7. **表示設定確認**
   - [ ] カラム数変更（1〜6列）が動作
   - [ ] 表示項目のチェックボックスで表示/非表示が切り替わる
   - [ ] タイトル最大文字数の変更が反映

8. **判定機能確認**
   - [ ] レベルセレクトボックスで選択できる
   - [ ] 「✓」ボタンでレベル変更が実行される
   - [ ] ファイル名が正しくリネームされる
   - [ ] DBのcurrent_favorite_levelが更新される
   - [ ] 成功メッセージが表示される
   - [ ] 自動的に画面が更新される（st.rerun）

9. **再生確認**
   - [ ] 「▶️」ボタンでプレイヤーが起動
   - [ ] viewing_historyにレコードが追加
   - [ ] play_historyにレコードが追加
   - [ ] library_rootが正しく記録

10. **ランダム再生確認**
    - [ ] フィルタ条件に合った動画がランダム選択
    - [ ] 「🎲 ランダム再生」ボタンで再生開始

11. **統計タブ確認**
    - [ ] カウンターA/B/Cが表示
    - [ ] 視聴回数が正しく表示
    - [ ] リセットボタンが動作
    - [ ] 視聴回数ランキングが表示
    - [ ] フィルタ（最小視聴回数、並び順）が動作

12. **スナップショット確認**
    - [ ] スナップショット取得ボタンが動作
    - [ ] data/snapshots/にファイルが作成
    - [ ] 比較機能が動作

13. **設定タブ確認**
    - [ ] ライブラリルート編集＋保存が動作
    - [ ] 保存後にスキャンが実行
    - [ ] 画面が自動更新

14. **エラーログ確認**
    - [ ] ターミナルにエラー出力がない
    - [ ] ブラウザコンソールにエラーがない

### 回帰テスト用サンプル操作

以下の一連の操作を実行し、すべてエラーなく完了することを確認：

1. アプリ起動
2. お気に入りレベル「4, 3」のみ選択
3. タイトル検索で「テスト」と入力
4. ソートを「視聴回数:多い順」に変更
5. カラム数を「3」に変更
6. 任意の動画の判定ボタンでレベル変更
7. 同じ動画の再生ボタンをクリック
8. ランダム再生タブで「🎲 ランダム再生」をクリック
9. 統計タブでカウンターAをリセット
10. スナップショットを取得
11. 設定タブでライブラリルートを編集して保存
12. サイドバーで「📁 ファイルをスキャン」をクリック

---

## リスクと回避策

### リスク1: import文の循環依存

**リスク**: `core/models.py`と`streamlit_app.py`の間で循環参照が発生する可能性

**回避策**:
- models.pyには純粋関数のみを配置し、UIへの依存を持たせない
- 必要に応じて`from __future__ import annotations`で型ヒントを遅延評価

### リスク2: グローバル関数の呼び出し変更漏れ

**リスク**: `_normalize_text()`等の関数名変更時、呼び出し箇所の変更漏れ

**回避策**:
- VSCodeの「シンボルの名前変更」機能を活用
- 各タスク完了後に必ずPythonファイルをコンパイルチェック（`python -m py_compile streamlit_app.py`）

### リスク3: DBクエリの結果形式変更

**リスク**: 関数化時に戻り値の形式が変わり、呼び出し元でエラー

**回避策**:
- 型ヒントを明示（`-> dict[int, int]`等）
- 移動前後で戻り値の型を一致させる
- テストデータで動作確認

### リスク4: セッション状態の不整合

**リスク**: リファクタリング中に`st.session_state`のキー名を変更し、既存セッションでエラー

**回避策**:
- セッション状態のキー名は変更しない
- 変更が必要な場合は、古いキーの値を新しいキーにコピーする移行コードを追加

### リスク5: 行数削減の優先で可読性低下

**リスク**: 無理に関数を統合して、かえって理解しにくいコードになる

**回避策**:
- 1関数30行以下を目安にするが、可読性を最優先
- 過度な抽象化は避け、明確な責務分離を重視

---

## 完了後のチェックリスト

### 📊 最終確認

- [ ] streamlit_app.py が300行以下
- [ ] UI層からの直接DBクエリがゼロ
- [ ] UI層にビジネスロジックが存在しない
- [ ] すべての関数が30行以下（render系を除く）
- [ ] すべての動作確認項目をクリア
- [ ] Pythonファイルの構文エラーなし（`python -m py_compile`で確認）
- [ ] 既存のすべてのテストが成功（`pytest`）
- [ ] コミット前にスナップショットを取得

### 📝 ドキュメント更新

- [ ] `docs/リファクタリング計画書_260110.md`の進捗メモを更新
- [ ] `CLAUDE.md`の構成図を最新化
- [ ] `docs/AGENT_SYSTEM_OVERVIEW.md`の参照ファイルリストを更新

---

## 参考資料

- `docs/リファクタリング計画書_260110.md`: 基本方針
- `docs/AGENT_SYSTEM_OVERVIEW.md`: 現行システム仕様
- `CLAUDE.md`: プロジェクト概要

---

**更新履歴**

| 日付 | 更新内容 |
|------|---------|
| 2026-01-11 | 初版作成（詳細計画書） |
