# ClipBox 用語集

対象読者: Coding agent。実装詳細ではなく、言葉がどういう意味で使われているかを定義する。

---

## Phase 1 用語方針（2026-06-02）

この節を現行仕様の正本とする。

| 用語 | 現行の定義 |
|---|---|
| `!` prefix | セレクション未選別。`needs_selection = 1` かつ `is_selection_completed = 0` の対象を表す。 |
| `?` prefix | 旧資料・検討時の表記。現行コードでは使わない。新規 docs/code では `!` を使う。 |
| `+` prefix | セレクション完了。ファイル名上の完了 prefix。 |
| セレクション完了 | 実装・概念上の状態名。DB では `is_selection_completed`、ファイル名では `+` prefix。 |
| 選別済み | 画面表示用の短いラベル。概念としては「セレクション完了」と同じ状態を指す。 |
| ライブラリ取り込み済み | 現行仕様では使わない。物理的な取り込み・移動完了と、選別完了が混同されるため。 |
| レベル表記 | UI/docs は `未判定` / `Lv0` / `Lv1` / `Lv2` / `Lv3` / `Lv4` に統一する。 |
| `FAVORITE_LEVEL_NAMES` | レベル表示名の正本。表示名を変える場合はここを更新する。 |
| `performer` | DB・コード上の正本。動画の登場人物を表す。 |
| `actors` | 旧 UI/session 名。active code では `performer(s)` に寄せる。 |
| 登場人物 | UI 日本語ラベル。DB/code の `performer` に対応する。 |
| `viewing_history` | 集計用の視聴履歴。視聴回数・ランキング・分析集計の基準。 |
| `play_history` | 再生ログ詳細。再生トリガー、プレイヤー、ライブラリルート、内部IDなどの詳細記録。 |

---

## 本質的ファイル名 (essential_filename)

プレフィックスをすべて除去した後のファイル名。
動画の同一性を判定する唯一の識別子。
パスが変わっても、プレフィックスが変わっても変化しない。
DB の UNIQUE 制約対象カラム。

---

## プレフィックス (prefix)

ファイル名の先頭に付くシステム管理文字列。お気に入りレベルとセレクション状態を表す。

| プレフィックス | 意味 |
|---|---|
| `####_` (Lv4) | Lv4 |
| `###_` (Lv3) | Lv3 |
| `##_` (Lv2) | Lv2 |
| `#_` (Lv1) | Lv1 |
| `_` (Lv0) | Lv0 |
| なし | 未判定（favorite_level = -1）|
| `!` | セレクション未選別（needs_selection = 1, is_selection_completed = 0）|
| `+` | セレクション完了（is_selection_completed = 1）。画面表示では「選別済み」。|

レベルプレフィックスとセレクションプレフィックスは組み合わせ可能（例: `!#_`）。

---

## お気に入りレベル (favorite_level)

動画の評価値。-1 から 4 の整数。

| 値 | 意味 |
|---|---|
| -1 | 未判定（プレフィックスなし） |
| 0 | Lv0（`_` プレフィックス） |
| 1〜4 | Lv1〜Lv4 |

DB カラム名: `current_favorite_level`

---

## 判定 (judgment)

動画に対してお気に入りレベルを設定する行為。
「判定する」= `set_favorite_level_with_rename()` を呼び出し、ファイルをリネームして DB を更新すること。
判定履歴は `judgment_history` テーブルに記録される。

## 判定済み (judged)

`current_favorite_level >= 0`（つまり 0, 1, 2, 3, 4 のいずれか）の動画。

## 未判定 (unrated)

`current_favorite_level = -1` の動画。

---

## Tier 1（一次判定）

未判定動画（`favorite_level = -1`）を対象に、初めてお気に入りレベルを付ける作業フロー。
ライブラリ・ランダム・運命の1本の3サブタブで構成。

## Tier 2（二次判定）

セレクション動画（`!` プレフィックス付き）を対象に、選別作業を行うフロー。
ライブラリ・ランダム・運命の1本の3サブタブで構成。

---

## セレクション (selection)

`!` プレフィックスが付いた動画群。一次判定済みの動画の中から選び出された、二次審査対象のグループ。
専用フォルダ（`selection_folder`）に物理的に移動された動画を管理する。

## 未選別 (needs_selection / unselected)

セレクション内で、まだ選別判定が行われていない動画。
`needs_selection = 1` かつ `is_selection_completed = 0` の状態。

## セレクション完了 / 選別済み (is_selection_completed)

セレクション内で、選別判定が完了した動画。
概念名は「セレクション完了」、画面表示は「選別済み」を使う。
DB カラム: `is_selection_completed BOOLEAN DEFAULT 0`

---

## 運命の1本 (fate video)

ボタン操作で動画プールから1本をランダム選出し、即座に再生・判定するモード。
Tier 1 では未判定動画から純粋ランダム選出、Tier 2 では経過日数重み付きで選出。

---

## KPI

進捗を示す4つの指標。UI のメトリクスカードに表示される。

| 指標 | 意味 |
|---|---|
| 未判定数 (unrated_count) | `favorite_level = -1` の動画数 |
| 判定済み数 (judged_count) | `favorite_level >= 0` の動画数 |
| 判定率 (judged_rate) | 判定済み / 全動画 × 100 (%) |
| 本日の判定数 (today_judged_count) | 今日0:00以降に判定した動画数 |

セレクション KPI は別途: 未選別数 / 選別済み数 / 選別率 / 本日の選別数。

---

## スキャン (scan)

指定ディレクトリを走査して動画ファイルを DB に登録・同期する処理。
スキャン結果に含まれなかった動画は `is_available = 0` に更新される（論理的に「見つからなかった」扱い）。
ディレクトリが0件の場合はスキップ（安全ガード）。

---

## is_available

動画ファイルが現在アクセス可能かどうかを示すフラグ。
`1` = 利用可能（ファイルが存在）、`0` = 利用不可（ドライブ未接続・ファイル消失など）。
スキャンによって自動更新される。

## is_deleted

論理削除フラグ。`1` の動画はすべてのクエリから除外する。
物理ファイルは消えていても DB レコードは保持される。

---

## is_judging

再生開始から判定完了までの間、`1` にセットされる一時フラグ。
**Phase 1 でアーカイブ済み**: UI バッジ表示は無効化。DB カラムは保持。
→ `archive/video_manager_methods.py` 参照。

---

## 視聴履歴 (viewing_history)

動画を再生するたびに記録されるログ。テーブル: `viewing_history`。
`viewing_method` カラムで記録の種別（APP_PLAYBACK / FILE_ACCESS_DETECTED / MANUAL_ENTRY）を区別。

---

## スキャンディレクトリ (SCAN_DIRECTORIES)

スキャン対象のルートディレクトリ一覧。`config.py` の `SCAN_DIRECTORIES` と `user_config.json` の `library_roots` で管理。

## セレクションフォルダ (selection_folder)

セレクション動画を格納するフォルダパス。`user_config.json` の `selection_folder` で管理。
空文字の場合はフォルダ絞り込みなし（全セレクション動画を対象）。

---

## AVP (Awesome Video Player)

外部動画プレイヤー。`avp_exe_path` で実行ファイルパスを設定する。
最大4本を同時再生（画面分割）する並列再生機能を提供。

## デフォルトプレイヤー (default_player)

単体再生で使用するプレイヤー。`user_config.json` の `default_player` キー（デフォルト: `"vlc"`）。

---

## ライブラリルート (library_roots)

スキャン対象のルートディレクトリ一覧（`user_config.json`）。
スキャン時に `library_roots` → `SCAN_DIRECTORIES` の順にフォールバックする。

## ストレージ場所 (storage_location)

動画ファイルがどのドライブに存在するかを示す文字列。
値例: `"C_DRIVE"`, `"EXTERNAL_HDD"`。DB カラム: `storage_location`。

---

## カウンター A/B/C (counter)

**Phase 1 でアーカイブ済み。**
視聴回数を計測するためのタイマーカウンター。
A/B/C の3種類があり、いずれかが未開始の場合に全カウンターを一斉開始する。
→ `archive/counter_service.py` 参照。

## スナップショット (snapshot)

**Phase 1 でアーカイブ済み。**
ある時点のDB内容・フィルタ・設定を別SQLiteファイルに保存する機能。
→ `archive/snapshot.py` 参照。
