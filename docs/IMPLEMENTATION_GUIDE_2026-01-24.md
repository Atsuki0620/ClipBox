# ClipBox 実装ガイド
**作成日**: 2026-01-24
**バージョン**: 1.0

---

## 実装順序

### フェーズ1: パフォーマンス・バグ修正

#### 1.1 B1: 起動時コード表示バグ修正

**対象ファイル**: `streamlit_app.py`

**修正箇所**: 行166付近

**Before**:
```python
st.code("python archive/setup_db.py", language="bash")
```

**After**:
- 該当行を削除、またはエラー時のみ表示するよう条件分岐

---

#### 1.2 B2: シャッフル時の設定リセット修正

**対象ファイル**: `ui/unrated_random_tab.py`

**問題**: `st.rerun()`後にウィジェット状態がリセットされる

**修正方針**:
```python
# セッション状態に表示設定を永続化
if "unrated_display_settings_cache" not in st.session_state:
    st.session_state.unrated_display_settings_cache = {}

# render_display_settings呼び出し後に保存
settings = render_display_settings(key_prefix="unrated_disp")
st.session_state.unrated_display_settings_cache = {
    "show_level": settings.show_level_badge,
    "show_avail": settings.show_availability_badge,
    # ... その他の設定
}
```

---

#### 1.3 P1: クリック時のもたつき改善

**対象ファイル**: `streamlit_app.py`, `ui/components/video_card.py`

**改善方針**:

1. **キャッシュの活用**:
```python
@st.cache_data(ttl=60)
def get_videos_cached(filter_params_hash):
    return video_manager.get_videos(**filter_params)
```

2. **st.fragmentの導入** (Streamlit 1.33+):
```python
@st.fragment
def render_video_card_actions(video):
    # カード内のボタン操作のみ部分更新
    pass
```

3. **不要なrerunの削除**:
- 再生ボタン押下時: `st.rerun()`を削除（プレイヤー起動のみ）
- 判定ボタン押下時: 最小限の状態更新のみ

---

### フェーズ2: UI改善

#### 2.1 U1: ボタンはみ出し修正

**対象ファイル**: `ui/components/video_card.py`

**修正箇所**: 行236付近

**Before**:
```python
btn_col, judge_col, select_col, badge_col = card.columns([2, 2, 4, 8])
```

**After**:
```python
# カラム幅を調整
btn_col, judge_col, select_col, badge_col = card.columns([1, 1, 2, 6])
```

**CSS追加** (行31-46付近):
```css
/* オーバーフロー防止 */
div[data-testid="column"] button {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
    padding: 2px 6px !important;
}
```

---

#### 2.2 U2: カラム数スライダー削除

**対象ファイル**: `ui/components/display_settings.py`

**修正箇所**: 行59-65付近

**削除対象**:
```python
num_cols = st.select_slider(
    "カラム数",
    options=[1, 2, 3, 4, 5, 6],
    value=3,
    key=f"{key_prefix}_num_cols",
)
```

**変更後**: 外部（タブ側）のラジオボタンで設定した値を使用

---

### フェーズ3: 新機能

#### 3.1 F4: 判定中バッジ（DB保存）

**1. データベース変更**

**対象ファイル**: `core/database.py`

```python
# スキーマに追加
CREATE TABLE IF NOT EXISTS videos (
    ...
    is_judging BOOLEAN DEFAULT 0,
    ...
)
```

**2. マイグレーション追加**

**対象ファイル**: `core/migration.py`

```python
def add_is_judging_column():
    """is_judgingカラムを追加"""
    with get_db_connection() as conn:
        cursor = conn.execute("PRAGMA table_info(videos)")
        columns = [row[1] for row in cursor.fetchall()]
        if "is_judging" not in columns:
            conn.execute("ALTER TABLE videos ADD COLUMN is_judging BOOLEAN DEFAULT 0")
            conn.commit()
```

**3. VideoManager更新**

**対象ファイル**: `core/video_manager.py`

```python
def set_judging_state(self, video_id: int, is_judging: bool):
    """判定中状態を設定"""
    with get_db_connection() as conn:
        conn.execute(
            "UPDATE videos SET is_judging = ? WHERE id = ?",
            (1 if is_judging else 0, video_id)
        )
```

**4. UI更新**

**対象ファイル**: `ui/components/video_card.py`

```python
# バッジ生成に追加
if video.is_judging:
    badges.append(_create_badge("判定中", "#f59e0b"))
```

**5. ハンドラー更新**

**対象ファイル**: `streamlit_app.py`

```python
def _handle_play(video):
    # 判定中フラグをセット
    st.session_state.video_manager.set_judging_state(video.id, True)
    st.session_state.video_manager.play_video(video)
    # ...

def _handle_judgment(video, level):
    # 判定中フラグをクリア
    st.session_state.video_manager.set_judging_state(video.id, False)
    # ...
```

---

#### 3.2 F3: 判定済みバッジ

**対象ファイル**: `ui/components/video_card.py`

**追加箇所**: `_build_badge_list()`関数内

```python
# 判定済みバッジ（current_favorite_level >= 0）
if video.current_favorite_level >= 0:
    badges.append(_create_badge("判定済み", "#22c55e"))
```

---

#### 3.3 F1: デフォルト表示項目追加

**対象ファイル**: `ui/components/display_settings.py`

**変更**: デフォルト値を調整

```python
@dataclass
class DisplaySettings:
    show_level_badge: bool = True
    show_availability_badge: bool = True
    show_view_count_badge: bool = True    # False → True
    show_storage_badge: bool = False
    show_filesize_badge: bool = False
    show_modified_badge: bool = False
    show_filename_badge: bool = True      # False → True
    show_created_badge: bool = True       # 新規追加
```

---

#### 3.4 F2: 作成日時表示追加

**1. DisplaySettings更新**

**対象ファイル**: `ui/components/display_settings.py`

```python
show_created_badge: bool = False  # 新規追加

# UIに追加
show_created = st.checkbox("作成日時", value=False, key=f"{key_prefix}_created")
```

**2. バッジ生成追加**

**対象ファイル**: `ui/components/video_card.py`

```python
if settings.show_created_badge and video.file_created_at:
    created_str = video.file_created_at.strftime("%Y-%m-%d")
    badges.append(_create_badge(f"作成:{created_str}", "#8b5cf6"))
```

---

### フェーズ4: 細かい改善

#### 4.1 U3: 視聴回数ランキングのラジオボタン化

**対象ファイル**: `ui/analysis_tab.py` または `ui/extra_tabs.py`

**修正**:
```python
# Before: スライダーまたは固定値
top_n = 20

# After: ラジオボタン
top_n = st.radio(
    "表示件数",
    options=[10, 20, 50, 100],
    index=1,  # デフォルト20
    horizontal=True,
    key="ranking_top_n"
)
```

---

## 検証手順

### 各フェーズ後の確認項目

#### フェーズ1後
- [ ] アプリ起動時にコードが表示されない
- [ ] 未判定ランダムタブでシャッフル後も表示設定が維持される
- [ ] ボタンクリックの反応速度が改善（目標: 0.3秒以内）

#### フェーズ2後
- [ ] 動画カードのボタンがはみ出していない
- [ ] 表示設定内にカラム数スライダーがない

#### フェーズ3後
- [ ] 再生ボタン押下で[判定中]バッジが表示される
- [ ] 判定ボタン押下で[判定中]が消え[判定済み]が表示される
- [ ] アプリ再起動後も判定中状態が維持される
- [ ] 作成日時が表示設定で選択可能

#### フェーズ4後
- [ ] 視聴回数ランキングの件数がラジオボタンで選択可能

---

## テスト実行

```bash
# ユニットテスト
pytest tests/ -v

# カバレッジ付き
pytest --cov=core tests/

# アプリ起動（手動確認）
streamlit run streamlit_app.py
```

---

## ロールバック手順

問題が発生した場合:

```bash
# 直前のコミットに戻す
git checkout HEAD~1 -- <ファイルパス>

# 特定のコミットに戻す
git checkout <commit-hash> -- <ファイルパス>
```

データベース変更のロールバック:
```sql
-- is_judgingカラムを削除（SQLiteは直接削除不可のため、テーブル再作成が必要）
-- 緊急時は is_judging = 0 にリセット
UPDATE videos SET is_judging = 0;
```
