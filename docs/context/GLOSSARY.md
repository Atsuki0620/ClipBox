# ClipBox 用語集

対象読者: Coding agent。実装詳細ではなく、言葉がどういう意味で使われているかを定義する。
画面・状態の挙動仕様は `SPEC_NEXTJS.md`、DB は `DATA_MODEL.md`、HTTP API は `API_SPEC.md` を正本とする（本書は用語の正本）。

---

## 用語方針（2026-06）

この節を現行仕様の用語正本とする。

| 用語 | 現行の定義 |
|---|---|
| `!` prefix | セレクション未選別。`needs_selection = 1` かつ `is_selection_completed = 0` の対象を表す。 |
| `+` prefix | セレクション完了。ファイル名上の完了 prefix。画面表示では「選別済み」。 |
| `?` prefix | 旧資料・検討時の表記。現行コードでは使わない。新規 docs/code では `!` を使う。 |
| セレクション完了 | 実装・概念上の状態名。DB では `is_selection_completed`、ファイル名では `+` prefix。 |
| 選別済み | 画面表示用の短いラベル。概念としては「セレクション完了」と同じ状態を指す。 |
| ライブラリ取り込み済み | 現行仕様では使わない。物理的な取り込み・移動完了と、選別完了が混同されるため。 |
| レベル表記 | UI/docs は `未判定` / `Lv0` / `Lv1` / `Lv2` / `Lv3` / `Lv4` に統一する。 |
| `FAVORITE_LEVEL_NAMES` | レベル表示名の正本。表示名を変える場合はここを更新する。 |
| `performer` | DB・コード上のカラム名（動画の登場人物。親ディレクトリ名由来）。**Next.js 版では登場人物フィルタは廃止**。DB カラムは互換のため保持。 |
| `actors` | 旧 UI/session 名。active code では `performer(s)` に寄せる。 |
| 登場人物 | UI 日本語ラベル。DB/code の `performer` に対応。フィルタ機能としては廃止。 |
| `viewing_history` | 集計用の視聴履歴。視聴回数・ランキング・分析集計の基準。 |
| `play_history` | 再生ログ詳細。再生トリガー、プレイヤー、ライブラリルート、内部IDなどの監査用詳細記録。 |

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
| `####_` | Lv4 |
| `###_` | Lv3 |
| `##_` | Lv2 |
| `#_` | Lv1 |
| `_` | Lv0 |
| なし | 未判定（`current_favorite_level = -1`） |
| `!` | セレクション未選別（`needs_selection = 1`, `is_selection_completed = 0`） |
| `+` | セレクション完了（`is_selection_completed = 1`）。画面表示では「選別済み」。 |

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

業務用語としては `current_favorite_level >= 0`（0, 1, 2, 3, 4 のいずれか）の動画を指す。

API レスポンスの `is_judged` は `Video.is_judged()` 由来の派生値で、ファイル名が `essential_filename` と異なるか（何らかのプレフィックスが付いているか）を基準にする。
業務用語の「判定済み」と完全に同じ意味として扱わない。

## 未判定 (unrated)

`current_favorite_level = -1` の動画。Tier1 の主対象。

---

## Tier 1（一次判定）

未判定動画（`current_favorite_level = -1`）を対象に、初めてお気に入りレベルを付ける作業フロー。
Next.js 版では `/` が Tier1 画面で、ライブラリ・ランダム・運命の1本の3サブタブで構成される。
カードの `displayContext` は `tier1`。

---

## Tier 2（二次判定 / セレクション）

`selection_folder` 配下のセレクション動画を対象に、選別作業を行うフロー。
未選別（`!`）と選別済み（`+`）の両方を扱う。
Next.js 版では `/tier2` が Tier2 画面で、ライブラリ・ランダム・運命の1本の3サブタブで構成される。
カードの `displayContext` は `tier2`。

Tier2 のレベルドロップダウンは **「未選別 / Lv0..Lv4」** の選択肢を出す。
「未判定」(-1) は Tier2 の選択肢に出さない。

- 「未選別」を選ぶ: `PUT /api/videos/{id}/unselect` を呼び、レベルは維持したまま `!{level_prefix}{essential_filename}` に戻す。
- `Lv0..Lv4` を選ぶ: `PUT /api/videos/{id}/level` を呼び、選別完了（`+`）にする。

---

## セレクション (selection)

一次判定済み動画から選び出され、`selection_folder` 配下で Tier2 が扱う動画群。
現行の概念としては、未選別の `!` 動画だけでなく、選別済みの `+` 動画も含む。

## セレクションフォルダ (selection_folder)

セレクション動画を格納するフォルダパス。`user_config.json` の `selection_folder` で管理。
空文字の場合はフォルダ絞り込みなし（全セレクション動画を対象）。

## 未選別 (needs_selection / unselected)

セレクション内で、まだ選別判定が完了していない動画。
`needs_selection = 1` かつ `is_selection_completed = 0` の状態。
ファイル名では `!` prefix。

## 未選別に戻す (unselect)

Tier2 で選別済み動画を、レベルを維持したまま未選別へ戻す操作。
`PUT /api/videos/{id}/unselect` が担当し、ファイルを `!{level_prefix}{essential_filename}` にリネームし、
`needs_selection = 1` / `is_selection_completed = 0` に更新する。

## セレクション完了 / 選別済み (is_selection_completed)

セレクション内で、選別判定が完了した動画。
概念名は「セレクション完了」、画面表示は「選別済み」を使う。
DB カラム: `is_selection_completed BOOLEAN DEFAULT 0`。
ファイル名では `+` prefix。

---

## あとで見る (watch_later)

判定・選別を先延ばしするためのブックマーク。
保存先は DB（`videos.watch_later`）で、全端末共通。
再生では解除されない。判定済み（level≥0）または選別完了（`+`）で自動解除される。
AVP候補とは目的も保存先も別。

Next.js 版の `/watch-later` は `watch_later=1` の動画をまとめて確認する専用ページ。
分類は「未処理」（Tier1 未判定 / Tier2 未選別）、「確認・見直し」（Tier1 判定済み / Tier2 選別済み）、「処理済み候補」。
処理済み候補は、処理済み状態かつ最終再生日がある動画を指し、一括解除の対象になる。

---

## いいね (likes)

動画への加点操作。`likes` テーブルに DB 永続される。
ランキングと総合スコアの因子であり、localStorage 状態ではない。
利用不可動画でも操作を許可する。

---

## 視聴履歴 (viewing_history)

動画を再生するたびに記録される集計用ログ。
テーブル: `viewing_history`。
視聴回数・最終再生日・ランキング・分析トレンドは `viewing_method = APP_PLAYBACK` のみを基準にする。
`FILE_ACCESS_DETECTED` / `MANUAL_ENTRY` は archived の旧データであり集計対象外。検証済みバックアップ後に保守スクリプトで削除する。
生履歴APIは監査用のためmethodを絞らず返す。

単体再生と AVP 再生はいずれも `viewing_history` に記録する。

## 再生履歴 (play_history)

再生ログ詳細。プレイヤー、トリガー、ライブラリルート、内部IDなどの詳細監査用。
視聴回数・ランキング・分析集計の基準ではない。
AVP 再生では `play_history` を記録しない。

## 最終再生日 / last-viewed

`viewing_history` の `APP_PLAYBACK` に限定した `MAX(viewed_at)` 由来の最終視聴日時。
`GET /api/stats/last-viewed` が動画IDごとのマップを返す。
カード表示設定で表示可否を切り替えられ、単体再生・AVP 再生後は関連クエリを invalidate して更新する。

---

## 運命の1本 (fate video)

ボタン操作で動画プールから1本をランダム選出し、即座に再生・判定するモード。
Tier1/Tier2 とも既定は純ランダム選出。

## 運命の1本の保持 (fate pick persistence)

Tier1/Tier2 の運命の1本で引いた結果を同じタブセッション内に保持する仕組み。
保存先は `sessionStorage` の `clipbox-fate-picks`。
別画面へ移動して戻ってもカードを再表示するが、復元表示では自動再生しない。
ブラウザタブのセッションを越えず、タブを閉じると消える。

## 最近見てない優先 (recently_unwatched_priority)

運命の1本の任意トグル。
ON のとき、最終 APP 再生からの日数に応じて未再生・長く見ていない動画を少し出やすくする。
重みは `weight = 1 + days / 90`、`days` は `0..180` に丸める。
Tier1/Tier2 で別々に `user_config.json` の hidden fields に保存する。

---

## AVP (Awesome Video Player)

外部動画プレイヤー。`avp_exe_path` で実行ファイルパスを設定する。
最大4本を同時再生（画面分割）する並列再生機能を提供する。
起動は FastAPI 実行マシン上で行う。

## AVP候補 (avpCandidateIds)

AVP で並列再生するためにプールした動画ID群。
保存先は `localStorage` の `clipbox-avp`。
そのブラウザにのみ残り、上限はない。
あとで見る（DB）とは別物。

## AVP再生対象 (avpPlayTargetIds)

AVP候補の中から、今回 AVP で実際に再生する動画ID群。
保存先は `localStorage` の `clipbox-avp`。
最大4本（`MAX_AVP_PLAY_TARGET = 4`）。
AVP 起動成功後は再生対象をクリアする。

## 再生中ハイライト (playback highlight)

直近に再生中として扱う動画の見た目強調。
「視聴済み（過去再生）」の意味ではない。
単体再生は `singlePlayingId`、AVP 再生は `avpPlayingIds`。
保存先は `localStorage` の `clipbox-playback`。
次の再生まで保持されるため、実態は「最後に再生した動画」に近い。

---

## displayContext

`VideoCard` の表示差を切り替えるためのフロントエンド用コンテキスト。
値は `tier1` / `tier2` / `avp` の3値で固定。

- `tier1`: Tier1 カード。レベル選択肢は `未判定 / Lv0..Lv4`。
- `tier2`: Tier2 カード。レベル選択肢は `未選別 / Lv0..Lv4`。
- `avp`: AVP 画面カード。再生対象チェックと候補削除操作を表示する。

第4値の追加は多態の複雑化に直結するため、追加前に `AI_WORKFLOW.md` の停止条件に従いユーザー確認する。

---

## 動画カード表示設定 (card_show_*)

`user_config.json` に保存されるカードバッジの ON/OFF 設定。
設定画面の「動画カード表示」セクションで管理する。

| 設定キー | 説明 | デフォルト |
|---|---|---|
| `card_show_storage` | ストレージ（例: C / HDD）バッジ | `true` |
| `card_show_file_size` | ファイルサイズバッジ | `false` |
| `card_show_last_viewed` | 最終再生日バッジ | `false` |
| `card_show_file_modified` | ファイル更新日バッジ | `false` |
| `card_title_max_length` | タイトル最大文字数。設定画面 UI なしの内部用。 | `0` |

`card_show_score` は廃止済みの互換キー。
設定ファイルや API 型には残り得るが、現行 UI のスコアバッジ表示には使わない。

---

## 検索正規化 (normalize_text)

本質的ファイル名検索で使う正規化処理。
`core/models.py:normalize_text()` に従い、NFKC 正規化、小文字化、カナ差吸収を行う。
全角半角・大小・カタカナ/ひらがな差を吸収して部分一致する。

---

## AvailabilityMode / 利用可否フィルタ

動画の利用可否を絞り込む UI/分析用の語。

| 表示 | 意味 |
|---|---|
| 利用可能のみ | `is_available = 1` の動画のみ |
| 利用不可のみ | `is_available = 0` の動画のみ |
| すべて | 利用可否で絞り込まない |

フロントの `AvailabilityMode` は `available` / `unavailable` / `all`。
API に渡すときはエンドポイントごとの `availability` / `show_unavailable` へ写像する。

---

## Runtime control / runtime lamp

開発時に Streamlit / FastAPI / Next.js の起動状態を Next.js サイドバーに lamp 表示し、
各サービスを停止するための運用補助機能。
ドメイン API ではない。
既定では無効で、`CLIPBOX_ENABLE_RUNTIME_CONTROL=1` で FastAPI を起動したときのみ `/api/runtime*` が公開される。
停止対象は ClipBox プロセスとして確認できるものに限定する。

---

## KPI

進捗を示す指標。UI のメトリクスカードに表示される。

| 指標 | 意味 |
|---|---|
| 未判定数 (unrated_count) | `current_favorite_level = -1` の動画数 |
| 判定済み数 (judged_count) | `current_favorite_level >= 0` の動画数 |
| 判定率 (judged_rate) | 判定済み / 全動画 × 100 (%) |
| 本日の判定数 (today_judged_count) | 今日0:00以降に判定した動画数 |

セレクション KPI は別途: 未選別数 / 選別済み数 / 選別率 / 本日の選別数。

---

## 総合スコア / 総合ランキング (composite)

ランキング種別の1つ。
式: `round((視聴日数×1 + いいね×3) × (1 + 0.5×判定済み + 0.3×選別済み) × 100)`。
因子は視聴日数・いいね・Tier1判定済み・Tier2選別済み。
視聴回数・レベル値・あとで見る・AVP候補はスコアに入れない。
詳細・理由は `SPEC_NEXTJS.md` §9。

## 発掘候補 (discovery candidate)

**検討中（仕様未確定）**: 総合ランキングにはまだ上がっていないが、有望そうな動画を見つけるための候補群。
総合ランキング上位ばかりが再生・評価され未露出動画と二極化する問題への対策として、
総合ランキングとは別枠で設けることを検討している概念。

候補条件の例（確定ではない）:
- 再生機会が少ない。
- 判定機会が少ない。
- 部分的な評価が高い。
- 最近見ていない。
- Tier1 判定済みだが Tier2 未選別。

実装前に分析用 notebook でデータ傾向を確認してから方針を決める。

---

## スキャン (scan)

指定ディレクトリを走査して動画ファイルを DB に登録・同期する処理。
スキャン結果に含まれなかった動画は `is_available = 0` に更新される（論理的に「見つからなかった」扱い）。
ディレクトリが0件の場合はスキップ（安全ガード）。

## is_available

動画ファイルが現在アクセス可能かどうかを示すフラグ。
`1` = 利用可能（ファイルが存在）、`0` = 利用不可（ドライブ未接続・ファイル消失など）。
スキャンによって自動更新される。

## is_deleted

論理削除フラグ。`1` の動画は原則として一覧系クエリから除外する。
物理ファイルは消えていても DB レコードは保持される。

---

## ライブラリルート (library_roots)

スキャン対象のルートディレクトリ一覧（`user_config.json`）。
スキャン時に `library_roots` → `SCAN_DIRECTORIES` の順にフォールバックする。

## スキャンディレクトリ (SCAN_DIRECTORIES)

スキャン対象のルートディレクトリ一覧。`config.py` の `SCAN_DIRECTORIES` と `user_config.json` の `library_roots` で管理。

## ストレージ場所 (storage_location)

動画ファイルがどのドライブに存在するかを示す文字列。
値例: `"C_DRIVE"`, `"EXTERNAL_HDD"`。DB カラム: `storage_location`。

## デフォルトプレイヤー (default_player)

単体再生で使用するプレイヤー。`user_config.json` の `default_player` キー（デフォルト: `"vlc"`）。

---

## archived / 現行機能ではない用語

以下は DB列や歴史資料が残っていても、現行機能として復活させない。

`archive/legacy-code/` は、現行実行経路から参照されない旧コード断片の隔離先。ここにあるコードの import・参照・復活は禁止し、復元する場合は別の設計・検証を必要とする。

## is_judging

再生開始から判定完了までの間、`1` にセットされていた一時フラグ。
**Phase 1 でアーカイブ済み**。UI バッジ表示は無効化。DB カラムは保持。
`archive/legacy-code/video_manager_methods.py` は歴史資料。

## カウンター A/B/C (counter)

**Phase 1 でアーカイブ済み。**
視聴回数を計測するためのタイマー式カウンター。
`archive/legacy-code/counter_service.py` は歴史資料。

## スナップショット (snapshot)

**Phase 1 でアーカイブ済み。**
ある時点のDB内容・フィルタ・設定を別SQLiteファイルに保存する機能。
`archive/legacy-code/snapshot.py` は歴史資料。
