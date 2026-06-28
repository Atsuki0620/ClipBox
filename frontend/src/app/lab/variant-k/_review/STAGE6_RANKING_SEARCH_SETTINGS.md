# 統合 Variant K — 段階6「ランキング・検索・設定 作り込み」実装メモ

> 段階6は本体実装ではなく **サンプルDB接続前の UI LAB モック**。実 API / DB / migration / 設定ファイル / 実データ / localStorage・sessionStorage 本体仕様には触れていない。状態はすべて **ページ内メモリ** に閉じている。対象は統合 Variant K の `/lab/variant-k/ranking`・`/lab/variant-k/search`・`/lab/variant-k/settings` のみ。

## 1. 実装した内容

残る主要3画面のプレースホルダーを作り込んだ。**ランキング＝数値で俯瞰／検索＝条件で見つけて処理**で、両者は統合しないが操作付きテーブル土台（`VariantKActionTable`）と行操作・行状態を共有する。**設定は scan-first**（スキャン主操作・自動保存・保存ボタンなし）。総合スコアは SPEC §9 の公式から再計算し、ランキング/検索の詳細列がスコアと整合する。

## 2. 作成・変更したファイル

**新規（共通土台 `_data/` `_components/`・追加のみ）**
- `_data/variantKScore.ts`（総合スコアの公式再計算・順位付けの純関数）
- `_components/useVariantKRowStates.ts`（行操作状態フック・ランキング/検索が各自インスタンス化）
- `_components/VariantKRowActions.tsx`（テーブル行の操作セル：再生/いいね/あとで見る/AVP候補）

**新規（`ranking/`）**
- `shared.ts`（フィルタ・ソート状態・ヘッダソート遷移の純関数）
- `RankingTable.tsx`（`VariantKActionTable` 流用・通常列＋詳細列・ソート可能ヘッダ）
- `page.tsx`（プレースホルダー置換・概要KPI＋詳細フィルタ＋詳細列トグル）

**新規（`search/`）**
- `shared.ts`（フィルタ・ソートの純関数）
- `SearchFilters.tsx`（キーワード入力＋詳細フィルタ）
- `SearchResults.tsx`（`VariantKActionTable` 流用・順位列なし）
- `page.tsx`（プレースホルダー置換・キーワード未入力は空状態）

**新規（`settings/`）**
- `useSettingsMockState.ts`（タブ・表示設定・スキャン進捗のメモリ状態。スキャンは setInterval モック・effect クリーンアップ）
- `page.tsx`（プレースホルダー置換・scan-first 上部タブ）
- `SettingsScanTab.tsx` / `SettingsDisplayTab.tsx` / `SettingsFoldersTab.tsx` / `SettingsBackupTab.tsx`

**変更**
- `CHANGELOG.md` — 段階6を追記。

**変更なし（流用のみ）**
- `_components/VariantKActionTable.tsx` / `VariantKSectionHeader.tsx` / `VariantKEmptyState.tsx` / `VariantKTooltipLabel.tsx` は既存 props のまま流用（土台は無改変）。
- `_data/variantKMock.ts` は変更せず既存17行（ids 1–17）で対応（各 Tier 状態・利用可否・いいね/あとで見る・スコア/視聴日数が出せる）。

## 3. ランキングの方針

総合スコアで俯瞰し、その場で操作する操作付きスコアテーブル。母集団は `rankVideos`（score>0 のみ・§9 タイブレーク）。上部に概要KPI（フィルタ後の対象本数・平均/最高スコア）、詳細フィルタ行、詳細列ON/OFF、再生可能だけ⇔全動画トグル（既定=再生可能だけ）。全動画時は利用不可行を薄表示し、再生/AVP候補は disabled。

## 4. ランキングの列・ソート・フィルタ

- 通常列: 順位 / タイトル / 総合スコア / 視聴日数 / いいね / Tier1 / Tier2 / 操作。
- 詳細列ON: 基礎点 / Tier1補正 / Tier2補正 / 補正倍率 / 保存先 を追加（総合スコアと整合）。
- ソート可能ヘッダ: 総合スコア / 視聴日数 / いいね（クリックで矢印表示・1回目降順→2回目昇順）。順位は現在のソート順での 1..N（id→順位の Map を行から生成）。
- フィルタ: 期間（全期間/直近30日/直近90日・最終再生日で判定）/ 最低レベル（Tier1 level）/ 保存先 / 再生可能だけ。すべてメモリ・永続しない。

## 5. 検索の方針

キーワード（ダミータイトルの部分一致）＋高機能フィルタで見つけて、その場で処理する。ランキングとは統合せず、テーブル土台と行操作・行状態だけを共有（別インスタンス・画面間で同期しない）。**順位列は出さない**。検索条件・結果は永続化しない。

## 6. 検索のフィルタ・列・空状態

- フィルタ: キーワード / 保存先 / 利用可否 / Tier1レベル / Tier2レベル / あとで見る / いいね / 最低視聴日数（プロンプト§8.4 のフィルタ一式）。
- 列: タイトル / 総合スコア / 視聴日数 / いいね / Tier1 / Tier2 / 操作（順位列なし）。ソート可能ヘッダ＝総合スコア/視聴日数/いいね。既定の並びは Tier1行→Tier2行→総合スコア降順。
- 空状態: キーワード未入力では `VariantKEmptyState`「キーワードを入力してください」。詳細フィルタだけでは検索しない。結果0件も `VariantKEmptyState`。

## 7. 設定の scan-first

上部セグメントタブ（スキャン/表示/フォルダ/バックアップ・既定=スキャン・`cn` イディオム）。**保存ボタンを置かず自動保存の見た目**。スキャンタブは大型「スキャン開始」を主操作に、流れ（自動バックアップ→Tier1→Tier2→結果確認）・モック進捗（進捗バー/現在処理/経過 mm:ss）・結果サマリー（総件数/所要時間/エラー/対象ストレージ）＋詳細折りたたみ（追加/更新/利用不可扱い/スキップ/エラー詳細）。スキャンは `setInterval` のモック進捗で、`useEffect` で必ずクリーンアップする（実スキャン・実バックアップはしない）。Tier2 未設定時は Tier2 ステップを「Tier2未設定のためスキップ」と表示。

## 8. 設定の表示・バッジ項目

- メタ項目（初期ON: ストレージ/視聴日数/作成日。選択可: 判定日・選別日/サイズ/最終再生日）。
- バッジ項目（初期ON: 該当Tier/あとで見る/利用不可。選択可: AVP候補=初期OFF/再生中=ハイライト優先の注記）。
- レベル表示対象: 該当Tierのみ（既定）/ Tier1・Tier2を両方表示。**「全Tier」という表現は使わない**。
- フォルダタブ: 表示名「Tier1フォルダ」「Tier2フォルダ」。内部 config キー（Tier1=`library_roots` / Tier2=`selection_folder`）は変更せずコメントで対応のみ記す。パスは匿名化したモック。**「ライブラリ」の語はフォルダ概念に使わない**（Tier1/Tier2 のタブ名に予約。スキャン見出しも「スキャンを実行」とした）。
- バックアップタブ: スキャン前自動バックアップを主役に、履歴をモック表示。手動バックアップは控えめ（破線枠の secondary ボタン）。

## 9. Runtime control を設定に置いていないこと

設定画面には Runtime control を一切置いていない（専用ページも作らない）。段階2どおりサイドバー下部のモックのまま。設定タブは スキャン/表示/フォルダ/バックアップ の4つで、Runtime control 本体仕様・Streamlit 表示には触れない。`rg "Runtime control" settings` のヒットは「ここに置かない」と明記した docstring/Tooltip のみ。

## 10. analysis を再設計していないこと

analysis 仮ページは触っていない。ナビに analysis（note「仮」）が残り、仮ページのまま。Recharts 再設計はしない。段階6の変更（新規ファイル追加＋3プレースホルダー置換）で analysis が壊れていないことを確認（ビルド検証は §下部スクショ・確認結果を参照）。

## 11. 視聴回数・更新日・登録日を出していないこと

ランキング/検索のテーブル列は 順位/タイトル/総合スコア/視聴日数/いいね/Tier1/Tier2/(詳細列)/操作 のみ。設定の表示タブのメタ項目にも 視聴回数/更新日/登録日 を出さず、注記で「UI から除外」と明示する。主役指標は視聴日数。サムネ/画像枠も出さない。`rg "視聴回数|更新日|登録日"` のヒットは「出さない/除外」の docstring と除外注記のみ。

## 12. 利用不可状態の見せ方

- ランキング/検索のテーブル: 行全体を薄く（`dimRow`）。操作セルの 再生・AVP候補追加 は disabled（title で理由表示）。いいね・あとで見るは可。
- ランキングは既定=再生可能だけ。全動画に切替えると利用不可行が薄表示で並ぶ。
- 検索は 利用可否フィルタ（すべて/再生可能/利用不可）で切替。

## 13. 既存 Variant への影響を避けるためにしたこと

- 既存 Variant A〜K・lab 共通部品・Tier1/Tier2/あとで見る/AVP/analysis のファイルは無改変。新規ロジックは `ranking/`・`search/`・`settings/` と、追加のみの共通土台（`_data/variantKScore.ts`・`_components/useVariantKRowStates.ts`・`_components/VariantKRowActions.tsx`）に閉じた。
- `VariantKActionTable` は改変せず、ソート/詳細列は呼び出し側が `columns` 配列と clickable header ReactNode で実装。
- `_data/variantKMock.ts` は変更なし（既存17行で各状態を表現できた）。
- 変更は `ranking/`・`search/`・`settings/`・追加の `_data`/`_components`・`_review/`・`CHANGELOG.md` に限定。

## 14. スクショ保存先

`frontend/src/app/lab/variant-k/_review/stage6/`

取得対象: ランキング全体／詳細列OFF／詳細列ON／全動画で利用不可行／検索 空状態／検索 結果／検索 フィルタ／設定 スキャン・表示・フォルダ・バックアップ各タブ／Runtime control（サイドバー下部）／lg未満横スクロール nav。

（取得状況はこのメモ末尾「スクショ取得状況」に追記する。取得不可の場合は理由と手動目視確認結果を記載する。）

## 15. 全体レビュー前の確認事項

- 総合スコアを公式から再計算した結果、ランキング/検索の表示スコアは整数（例 5940）になり、AVP 画面（段階5・mock score の `128.4 pt` 表示）とは桁が異なる。これは「ランキング/検索＝公式どおり再計算・AVP＝mock 据え置き」という確定方針どおり。最終的に AVP も公式へ寄せるか、別タスクで判断する。
- ランキングの期間フィルタは基準日 `2026-06-28`（currentDate）固定のモック。実装時は `/stats/last-viewed` 相当に置き換える。
- 検索の既定並び（Tier1行→Tier2行→総合スコア降順）の採否。ヘッダクリックで各指標のフラットソートに切り替わる。
- 設定の表示設定キー（メタ/バッジ）と本体 `card_show_*` の対応付け（本段階は表示名のみ・内部キー不変）。

## 16. 未対応リスク（段階6では直さない）

- **外側 SidebarNav の 390px 幅制約**: 既存ルートレイアウト由来で、統合 Variant K 内の作り込みとは別スコープのため段階6では未対応。Variant K 内の lg 未満横スクロール nav が機能することのみ確認する。
- **既存 Recharts 警告 `width(-1) and height(-1)`**: 今回の変更箇所と無関係（段階6の3画面は Recharts 不使用）。段階6では直さない。
- **オフライン環境での `npm run build`**: `src/app/layout.tsx` の `next/font/google`（Geist Mono）が `fonts.gstatic.com` へ到達できずビルドが失敗する環境制約。段階6のコード起因ではなく（typecheck・lint は通過）、本段階の対象外。

---

## スクショ取得状況（2026-06-28 取得完了）

Claude Code 環境の Playwright（MCP）で `frontend/src/app/lab/variant-k/_review/stage6/` に取得:

- `ranking-default.png` — ランキング全体（詳細列OFF・既定=再生可能だけ・概要KPI 対象10件/平均2826/最高9180・サイドバー下部の Runtime control）
- `ranking-details-on.png` — 詳細列ON（基礎点/Tier1補正/Tier2補正/補正倍率/保存先 が総合スコアと整合。例 id6=51×1.8×100=9180、id12=23×1.5×100=3450、Tier2非対象は Tier2補正「—」）
- `ranking-all-unavailable.png` — 再生可能だけOFF（全動画。利用不可行が薄表示で並び、操作の再生/AVP候補が disabled）
- `ranking-fullpage-runtime-control.png` — ランキング全画面（サイドバー下部の RUNTIME CONTROL モック：FastAPI :8000 起動中 / Next.js :3000 起動中 が写っている）
- `search-empty.png` — 検索 キーワード未入力の空状態（「キーワードを入力してください」・詳細フィルタは表示）
- `search-results.png` — 検索 結果＋フィルタ（キーワード "clip" で該当5件・既定並びは Tier1行→Tier2行→総合スコア降順・順位列なし・利用不可 `sample_clip_004` は薄表示＋操作 disabled）
- `settings-scan.png` — 設定 スキャンタブ（idle・大型「スキャン開始」・4ステップの流れ）
- `settings-scan-done.png` — 設定 スキャン完了（進捗バー満了・経過02:13/所要2分13秒・結果サマリー・詳細折りたたみ展開・保存ボタンなし）
- `settings-display.png` — 設定 表示タブ（メタ項目/バッジ項目/レベル表示対象＝該当Tierのみ・「視聴回数/更新日/登録日は UI から除外」注記）
- `settings-folders.png` — 設定 フォルダタブ（Tier1フォルダ複数/Tier2フォルダ単一・匿名化モックパス・「ライブラリ」をフォルダ概念に使っていない）
- `settings-backup.png` — 設定 バックアップタブ（スキャン前自動バックアップが主役・履歴モック・手動バックアップは控えめ）
- `mobile-nav.png` — lg 未満（ビューポート 390px → innerWidth=585 にクランプ）で内側サイドバーが隠れ、横スクロール nav が表示される状態

手動目視で確認した挙動:
- 総合スコアが公式どおりに再計算され、詳細列（基礎点/各補正/補正倍率）と一致する。score=0（id3/7/9 など未再生・いいねなし）はランキングに出ない。
- ランキングのヘッダ（総合スコア/視聴日数/いいね）クリックで降順⇔昇順が切り替わり、順位が現在の並び順での 1..N で振り直される。
- 詳細列ON/OFF・再生可能だけ⇔全動画が切り替わり、全動画時は利用不可行が薄表示＋再生/AVP不可。
- 検索はキーワード未入力で空状態、入力で結果表示。順位列は出さない。利用不可は薄表示＋操作 disabled。
- 設定はタブ切替（スキャン/表示/フォルダ/バックアップ）が機能し、スキャンはモック進捗→完了→結果サマリー＋詳細折りたたみ。保存ボタンはなく、Runtime control は設定に置かずサイドバー下部に残る。
- analysis（仮）・ランキング・検索・設定の各ルートは HTTP 200 で表示でき、段階6変更で analysis は壊れていない。
- 撮影時のコンソールエラーは FastAPI（:8000）未起動による `/api/runtime` の `ERR_CONNECTION_REFUSED` のみ（ルートレイアウトの実 SidebarNav ポーラー由来）。Variant K モックとは無関係。
