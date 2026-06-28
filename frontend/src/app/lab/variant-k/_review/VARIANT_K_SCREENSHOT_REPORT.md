# 統合 Variant K スクリーンショットレビュー

> 作成日: 2026-06-29
> 対象: /lab/variant-k/*
> 目的: 統合 Variant K の全画面レビュー用スクリーンショット記録

画像はすべて `./variant-k-full-report-20260629/` に保存。ブラウザ最大化相当（viewport 1920×1080）で撮影し、Popover/Select を開いた状態と狭幅レスポンシブのみ別条件（詳細は「確認環境」）。すべて UI LAB モック（合成データ）で、実 API/DB には接続していない。

## Summary

- **全体所感**: 共通シェル（左サイドバー＝判定/消化・再生/探す・俯瞰/システムのグルーピング＋下部 Runtime control）が全画面で一貫。STAGE7 監査（§1/§2/§7・§3-1/§3-2）の修正がすべて画面上で確認できる。視聴日数を主役・視聴回数/更新日/登録日/サムネは非表示の方針も全画面で守られている。
- **特に見てほしい箇所**:
  1. Tier1 ライブラリのカード⇄テーブル切替＋ページャ（`02`/`03`）、フィルタ漏斗 Popover（`04`）、並び替え2段 Popover（`05`）、レベル 未/0/1/2/3/4 の6択（全カード）。
  2. ランキング/検索の Tier1・Tier2 列が**行内プルダウン**（`21`/`22`/`26`）。対象外は「—」表示。
  3. AVP の総合スコアが**公式再計算の整数**（`16`/`18`、例 9,180 pt（総合 1位））でランキング/検索と桁一致。「AVPで再生」を主操作として強調（`18`）。
  4. 設定バックアップに**手動バックアップボタンが無い**（`33`）。
  5. **入れ子チロームの二重ナビ**（後述・既知）と、**狭幅でルート外側サイドバーが畳まれない**点（`35`）。
- **既知の未反映事項へのリンク**:
  - 監査記録: [`STAGE7_FEEDBACK_AUDIT.md`](./STAGE7_FEEDBACK_AUDIT.md)（§1/§2/§7・§3-1/§3-2 は対応済み、§3-3 対応不要、§3-4 のみ延期＝本体バックエンド作業・必要性も未確定）。
  - 実装経緯: リポジトリ直下 `CHANGELOG.md`（2026-06-29 エントリ）。
- **今回スクリーンショットで確認できた範囲**: 9画面＋主要状態（カード/テーブル、Popover、再生中ハイライト、Tier2 案1/案2、AVP 4本投入・再生後・利用不可ブロック、ランキング詳細列/全表示、検索 空/結果/詳細フィルタ/利用不可、設定4タブ＋スキャン完了、analysis 仮、狭幅ナビ）。
- **未確認事項**:
  - 実 API/DB 連携時の値・件数（本モックは合成17件）。§3-4 の API 束は UI に現れないため本レポート対象外。
  - あとで見るの「解除後」差分（`15` は任意のため未取得）。
  - 個別ホバー Tooltip の内容差分（静的撮影のため未網羅）。

## Screenshot Index

| # | 画面 | 状態 | スクリーンショット | レビュー観点 |
|---|---|---|---|---|
| 01 | ランディング | 全体 | [01-landing-full](./variant-k-full-report-20260629/01-landing-full.png) | 8画面カードの導線・説明文・入れ子ナビ |
| 02 | Tier1 ライブラリ | カード（既定） | [02-tier1-library-card](./variant-k-full-report-20260629/02-tier1-library-card.png) | カード密度・レベル6択・1段操作 |
| 03 | Tier1 ライブラリ | テーブル | [03-tier1-library-table](./variant-k-full-report-20260629/03-tier1-library-table.png) | 列構成・行内レベル・ページャ |
| 04 | Tier1 ライブラリ | フィルタ Popover | [04-tier1-filter-popover](./variant-k-full-report-20260629/04-tier1-filter-popover.png) | レベル/保存先/状態/再生可/薄く・有効数バッジ |
| 05 | Tier1 ライブラリ | 並び替え Popover | [05-tier1-sort-popover](./variant-k-full-report-20260629/05-tier1-sort-popover.png) | 5項目＋降順/昇順の2段 |
| 06 | Tier1 ランダム | 多本提示 | [06-tier1-random](./variant-k-full-report-20260629/06-tier1-random.png) | シャッフル＋引き数 5/10/15/20 |
| 07 | Tier1 運命の1本 | 1本提示 | [07-tier1-fate](./variant-k-full-report-20260629/07-tier1-fate.png) | 大型ボタン・履歴なし文言 |
| 08 | Tier1 ライブラリ | 再生中ハイライト | [08-tier1-playing-highlight](./variant-k-full-report-20260629/08-tier1-playing-highlight.png) | amber ハイライト優先 |
| 09 | Tier2 | 案1・ライブラリ（利用不可含む） | [09-tier2-reuse-library](./variant-k-full-report-20260629/09-tier2-reuse-library.png) | Tier1流用文言・選別ボタン・利用不可カード |
| 10 | Tier2 | 案2・ライブラリ（利用不可含む） | [10-tier2-selection-library](./variant-k-full-report-20260629/10-tier2-selection-library.png) | Tier2専用文言強め・差分は文言のみ |
| 11 | Tier2 ランダム | 提示 | [11-tier2-random](./variant-k-full-report-20260629/11-tier2-random.png) | 未選別優先（固定条件） |
| 12 | Tier2 運命の1本 | 1本提示 | [12-tier2-fate](./variant-k-full-report-20260629/12-tier2-fate.png) | 二次選別文言 |
| 14 | あとで見る | 3セクション全体 | [14-watchlater-overview](./variant-k-full-report-20260629/14-watchlater-overview.png) | 未処理/確認・見直し/処理済み候補・5列 |
| 16 | AVP | 初期（候補テーブル＋空2×2） | [16-avp-initial](./variant-k-full-report-20260629/16-avp-initial.png) | 公式スコア＋総合順位・タイトル省略 |
| 18 | AVP | 再生対象4本 | [18-avp-playset-4](./variant-k-full-report-20260629/18-avp-playset-4.png) | 2×2・「AVPで再生」強調 |
| 19 | AVP | AVP再生後ハイライト | [19-avp-playing-highlight](./variant-k-full-report-20260629/19-avp-playing-highlight.png) | 再生中ハイライト・あとで見る非解除 |
| 20 | AVP | 利用不可は追加不可 | [20-avp-unavailable-blocked](./variant-k-full-report-20260629/20-avp-unavailable-blocked.png) | 全表示時の利用不可行 disabled |
| 21 | ランキング | 既定（再生可能だけ） | [21-ranking-default](./variant-k-full-report-20260629/21-ranking-default.png) | Tier 列プルダウン・公式スコア |
| 22 | ランキング | 詳細列ON | [22-ranking-details-on](./variant-k-full-report-20260629/22-ranking-details-on.png) | 基礎点/補正/倍率/保存先 |
| 22b | ランキング | 詳細フィルタ Popover | [22-ranking-detail-popover](./variant-k-full-report-20260629/22-ranking-detail-popover.png) | 期間/最低レベル/保存先/再生可/詳細列を畳む |
| 23 | ランキング | 全動画（利用不可行） | [23-ranking-all-unavailable](./variant-k-full-report-20260629/23-ranking-all-unavailable.png) | 利用不可の薄表示・操作 disabled |
| 25 | 検索 | 空状態 | [25-search-empty](./variant-k-full-report-20260629/25-search-empty.png) | キーワード未入力の空状態 |
| 26 | 検索 | 結果 | [26-search-results](./variant-k-full-report-20260629/26-search-results.png) | Tier 列プルダウン・順位列なし |
| 27 | 検索 | 詳細フィルタ Popover | [27-search-filter-popover](./variant-k-full-report-20260629/27-search-filter-popover.png) | キーワード以外を畳む・有効数バッジ |
| 28 | 検索 | 利用不可行＋バッジ | [28-search-unavailable](./variant-k-full-report-20260629/28-search-unavailable.png) | タイトル横「利用不可」・保存先詳細列 |
| 29 | 設定 | スキャン（待機） | [29-settings-scan](./variant-k-full-report-20260629/29-settings-scan.png) | scan-first・4ステップ |
| 30 | 設定 | スキャン完了＋詳細 | [30-settings-scan-complete](./variant-k-full-report-20260629/30-settings-scan-complete.png) | 進捗→結果サマリー→詳細折りたたみ |
| 31 | 設定 | 表示 | [31-settings-display](./variant-k-full-report-20260629/31-settings-display.png) | メタ/バッジ項目・レベル表示対象 |
| 32 | 設定 | フォルダ | [32-settings-folders](./variant-k-full-report-20260629/32-settings-folders.png) | Tier1/Tier2フォルダ表示名 |
| 33 | 設定 | バックアップ | [33-settings-backup](./variant-k-full-report-20260629/33-settings-backup.png) | 自動主役・手動ボタン無し |
| 34 | analysis | 仮ページ | [34-analysis-placeholder](./variant-k-full-report-20260629/34-analysis-placeholder.png) | 採用判断対象外・共通レイアウト波及のみ |
| 35 | レスポンシブ | 狭幅ナビ | [35-responsive-mobile-nav](./variant-k-full-report-20260629/35-responsive-mobile-nav.png) | variant-k モバイル横スクロールナビ |

> 補足: `13`（Tier2 利用不可）は `09`/`10` のライブラリに利用不可カードが含まれるため統合。`15`（あとで見る解除後）・`17`（AVP 候補テーブル単独＝`16`に内包）・`24`（ランキング ソート状態）は任意のため未取得。

## 画面別レビュー

### 1. ランディング

![landing](./variant-k-full-report-20260629/01-landing-full.png)

- **見るべき点**: 8画面（Tier1/Tier2/あとで見る/AVP/ランキング/検索/analysis/設定）をカードで一覧。各カードに1行説明。上部に「サンプルDB接続前・本体ではない」「一覧」リンク。左に variant-k 専用サイドバー＋下部 Runtime control（FastAPI/Next.js・アプリを停止）。
- **気になる点**: ラボ/ルートの外側 `SidebarNav`（さらに左の細い列＝Tier1/Tier2/…/設定＋ローカル動画判定パネル）が variant-k シェルの外側に重なり、**左に二重のナビ**が見える。レビューは中央の variant-k シェルが対象（既知のラボ入れ子制約）。
- **STAGE7監査との関係**: 画面横断のシェル方針（Runtime control をサイドバー下部に残す）を満たす。

### 2. Tier1

#### ライブラリ（カード）

![tier1 card](./variant-k-full-report-20260629/02-tier1-library-card.png)

- **見るべき点**: KPI（未判定/判定済み/判定率/今日の処理目安＋スパークライン）。各カードはレベル **未/0/1/2/3/4** の6択＋1段アイコン操作（再生＝アイコンのみ／♡＋数／栞＝あとで見る／`MonitorPlay`＝AVP候補）。該当Tier/あとで見る/利用不可バッジ。
- **STAGE7監査との関係**: §7-D（レベル6択・「判定」ラベル削除・1段操作）/§7-C（共通部品）反映。

#### ライブラリ（テーブル）

![tier1 table](./variant-k-full-report-20260629/03-tier1-library-table.png)

- **見るべき点**: タイトル/視聴日数/作成日/判定日/レベル（行内6択ボタン）/操作。下部にページャ（全17件・1ページ 50/100/200・前後送り）。
- **気になる点**: 17件のため 1/1。実データ件数では 50/200 切替・ページ送りの確認が要る。
- **STAGE7監査との関係**: §1-A（カード⇄テーブル＋ページャ）反映。

#### フィルタ Popover

![tier1 filter](./variant-k-full-report-20260629/04-tier1-filter-popover.png)

- **見るべき点**: 漏斗→Popover。レベル(未/0–4 chip)・保存先(C/HDD)・状態(すべて/未判定/判定済み)・再生可のみ・「判定済みを薄くする」(既定 ON)＋有効フィルタ数バッジ。常時全表示しない。
- **STAGE7監査との関係**: §7-A 反映。

#### 並び替え Popover

![tier1 sort](./variant-k-full-report-20260629/05-tier1-sort-popover.png)

- **見るべき点**: 1段目＝レベル/作成日/視聴日数/タイトル/判定日、2段目＝降順/昇順。視聴回数・最終再生日は項目に無い。
- **STAGE7監査との関係**: §7-B 反映（視聴回数復活なし・作成日優先）。

#### ランダム

![tier1 random](./variant-k-full-report-20260629/06-tier1-random.png)

- **見るべき点**: 主ボタン＝シャッフル、引き数 5/10/15/20、未判定かつ再生可能から多本提示。
- **STAGE7監査との関係**: §3-1（多本提示に戻す）反映。

#### 運命の1本

![tier1 fate](./variant-k-full-report-20260629/07-tier1-fate.png)

- **見るべき点**: 大型「運命の1本を引く」ボタン＋1本のみ提示。「最近見てない優先」トグル。履歴は残さない文言。

#### 再生中ハイライト

![tier1 playing](./variant-k-full-report-20260629/08-tier1-playing-highlight.png)

- **見るべき点**: 先頭カード（dummy_clip_aa9）が再生中（amber）ハイライト。バッジより優先。

### 3. Tier2

#### 案1: Tier1流用案（ライブラリ）

![tier2 reuse](./variant-k-full-report-20260629/09-tier2-reuse-library.png)

- **見るべき点**: Tier1 と近い操作感。選別ボタン（未選別/0..4）＋1段操作。利用不可カードが薄表示＋disabled で見える（item 13 を内包）。

#### 案2: Tier2専用文言強め案（ライブラリ）

![tier2 selection](./variant-k-full-report-20260629/10-tier2-selection-library.png)

- **見るべき点**: 文言だけ Tier2 寄り（カード構造・操作・状態は共有）。案1/案2 トグルで切替。
- **STAGE7監査との関係**: §7-C 共通部品（Tier2 も `VariantKCardActions`/`VariantKLevelButtons`）。

#### ランダム / 運命の1本

![tier2 random](./variant-k-full-report-20260629/11-tier2-random.png)
![tier2 fate](./variant-k-full-report-20260629/12-tier2-fate.png)

- **見るべき点**: Tier2 対象・再生可能・未選別優先（固定条件）。運命の1本は二次選別文言。

### 4. あとで見る

![watch-later](./variant-k-full-report-20260629/14-watchlater-overview.png)

- **見るべき点**: 未処理／確認・見直し／処理済み候補の3セクション。PC幅5列基準。カード操作は解除（栞×）variant＋AVP候補＋該当Tierへ戻る導線。ステータスは `Tier1 Lv3`/`Tier2 未選別` で混同しない。
- **気になる点**: 「解除後」の状態差分（item 15）は未取得。必要なら追補可能。
- **STAGE7監査との関係**: §2-5（5列）/§7-C 反映。

### 5. AVP

#### 初期（候補テーブル＋空2×2）

![avp initial](./variant-k-full-report-20260629/16-avp-initial.png)

- **見るべき点**: 候補テーブルの総合スコアが **9,180 pt（総合 1位）** 等の公式整数。タイトル省略（全名 hover）。あとで見る列は表示のみ。空2×2は控えめプレースホルダ。
- **STAGE7監査との関係**: §3-2（公式統一）/§2-2（タイトル省略）反映。

#### 再生対象4本

![avp playset](./variant-k-full-report-20260629/18-avp-playset-4.png)

- **見るべき点**: 上位4本を2×2へ。下段ヘッダ右に **「AVPで再生」を強調**（primary・大きめ）。「再生対象をまとめていいね」「再生対象をクリア」。
- **STAGE7監査との関係**: §2-1（ボタン名）/§2-6（強調）/§1-C（主要ボタンの Tooltip 撤去）反映。

#### AVP再生後ハイライト

![avp playing](./variant-k-full-report-20260629/19-avp-playing-highlight.png)

- **見るべき点**: 再生対象が再生中ハイライト。あとで見るは自動解除しない。

#### 利用不可は追加不可

![avp blocked](./variant-k-full-report-20260629/20-avp-unavailable-blocked.png)

- **見るべき点**: 「再生可能だけ」OFF で利用不可候補が現れ、「再生対象に追加」が disabled（理由は残した title のみ）。

### 6. ランキング

#### 既定表示

![ranking default](./variant-k-full-report-20260629/21-ranking-default.png)

- **見るべき点**: 概要KPI（対象本数/平均/最高 9,180）。Tier1/Tier2 列が**プルダウン**（対象外は「—」）。ヘッダ（総合スコア/視聴日数/いいね）クリックで降順⇔昇順。既定＝再生可能だけ。
- **STAGE7監査との関係**: §1-B（Tier 列プルダウン）反映。

#### 詳細列ON ＋ 詳細フィルタ Popover

![ranking details](./variant-k-full-report-20260629/22-ranking-details-on.png)
![ranking popover](./variant-k-full-report-20260629/22-ranking-detail-popover.png)

- **見るべき点**: 詳細列で 基礎点/Tier1補正(+0.5)/Tier2補正(+0.3)/補正倍率(×1.8)/保存先 を表示し総合スコアと整合。詳細フィルタは漏斗 Popover に畳む（有効数バッジ）。1920px で列はあふれず収まる。
- **STAGE7監査との関係**: §2-3/§2-8（詳細フィルタ畳み）反映。

#### 全動画（利用不可行）

![ranking all](./variant-k-full-report-20260629/23-ranking-all-unavailable.png)

- **見るべき点**: 「再生可能だけ」OFF で利用不可行が薄表示＋操作 disabled。値編集で行を即時除去しない方針。

### 7. 検索

#### 空状態

![search empty](./variant-k-full-report-20260629/25-search-empty.png)

- **見るべき点**: キーワード未入力で空状態。詳細フィルタだけでは検索しない旨を明記。

#### 結果

![search results](./variant-k-full-report-20260629/26-search-results.png)

- **見るべき点**: キーワード「sample」一致。順位列なし。Tier 列プルダウン。総合スコアは公式整数。
- **STAGE7監査との関係**: §1-B 反映。

#### 詳細フィルタ Popover

![search popover](./variant-k-full-report-20260629/27-search-filter-popover.png)

- **見るべき点**: キーワードは常時表示、それ以外（保存先/利用可否/最低視聴日数/Tier1/Tier2/あとで見る/いいね）を漏斗 Popover に畳む。有効数バッジ。詳細列（保存先）トグルあり。
- **STAGE7監査との関係**: §1-D/§2-8 反映。

#### 利用不可行＋バッジ

![search unavailable](./variant-k-full-report-20260629/28-search-unavailable.png)

- **見るべき点**: キーワード「test_footage」。タイトル横に「利用不可」バッジ＋行薄表示。詳細列で保存先（匿名化分類）。
- **STAGE7監査との関係**: §2-7（利用不可タイトル横バッジ）/§1-D（保存先詳細列）反映。

### 8. 設定

![settings scan](./variant-k-full-report-20260629/29-settings-scan.png)
![settings scan complete](./variant-k-full-report-20260629/30-settings-scan-complete.png)

- **見るべき点**: scan-first の上部タブ（スキャン/表示/フォルダ/バックアップ・既定=スキャン）。自動バックアップ→Tier1→Tier2→結果確認の4ステップ。完了で結果サマリー（総件数/所要時間/エラー/対象ストレージ）＋詳細折りたたみ。自動保存（保存ボタンなし）。

![settings display](./variant-k-full-report-20260629/31-settings-display.png)
![settings folders](./variant-k-full-report-20260629/32-settings-folders.png)
![settings backup](./variant-k-full-report-20260629/33-settings-backup.png)

- **見るべき点**: 表示＝メタ/バッジ項目分離（AVP候補初期OFF）＋レベル表示対象（該当Tierのみ既定／Tier1・Tier2を両方表示）。フォルダ＝「Tier1フォルダ/Tier2フォルダ」表示名（内部キー不変）。バックアップ＝自動が主役で**手動バックアップボタンが無い**。
- **STAGE7監査との関係**: §1-E（手動バックアップ撤去）反映。

### 9. analysis

![analysis](./variant-k-full-report-20260629/34-analysis-placeholder.png)

- **見るべき点**: 採用判断対象外の仮ページ（共通シェル/余白/テーマの波及のみ確認）。再設計していない。

### 10. レスポンシブ

![responsive](./variant-k-full-report-20260629/35-responsive-mobile-nav.png)

- **見るべき点**: 狭幅（390px）で variant-k の横スクロールナビ（Tier1/Tier2/あとで…＋スクロール矢印）が出る。カードは1列に縮約。
- **気になる点**: ラボ/ルートの外側 `SidebarNav` が狭幅でも畳まれず左半分を占有し、variant-k コンテンツが右半分に押し込まれる（既知のラボ入れ子制約）。実画面（ルート直下）では本体レイアウトのレスポンシブが効く前提。

## STAGE7監査との対応

| STAGE7項目 | 画面 | スクリーンショット | 画面で確認できる状態 | 残対応 |
|---|---|---|---|---|
| §1-A カード⇄テーブル＋ページャ | Tier1 | 02/03 | 切替＋50/100/200＋前後送り | ✅ 反映済み |
| §1-B Tier 列プルダウン | ランキング/検索 | 21/22/26 | 行内 Select・対象外「—」 | ✅ 反映済み |
| §1-C AVP 主要ボタン Tooltip 整理 | AVP | 18/20 | 主要ボタン title 無し・disabled 理由のみ | ✅ 反映済み |
| §1-D 検索 詳細フィルタ畳み＋保存先列 | 検索 | 27/28 | Popover＋保存先列 | ✅ 反映済み |
| §1-E 設定 手動バックアップ撤去 | 設定 | 33 | 手動ボタン無し・自動主役 | ✅ 反映済み |
| §2-1 AVP 一括いいね名 | AVP | 18 | 「再生対象をまとめていいね」 | ✅ 反映済み |
| §2-2 AVP タイトル省略 | AVP | 16 | truncate＋全名 hover | ✅ 反映済み |
| §2-3/§2-8 詳細フィルタ畳み統一 | ランキング/検索 | 22b/27 | 両方 Popover＋有効数バッジ | ✅ 反映済み |
| §2-4 自作 SVG ロゴ | 全画面サイドバー | 01 ほか | 箱＋再生三角マーク | ✅ 反映済み |
| §2-5 あとで見る5列 | あとで見る | 14 | PC幅5列基準 | ✅ 反映済み |
| §2-6 「AVPで再生」強調 | AVP | 18 | 主操作として強調 | ✅ 反映済み |
| §2-7 検索 利用不可バッジ | 検索 | 28 | タイトル横バッジ | ✅ 反映済み |
| §7-A Tier1 フィルタ Popover | Tier1 | 04 | 漏斗 Popover＋バッジ | ✅ 反映済み |
| §7-B Tier1 並び替え2段 Popover | Tier1 | 05 | 5項目＋降順/昇順 | ✅ 反映済み |
| §7-C カード操作共通部品化 | Tier1/Tier2/あとで見る/AVP | 02/09/14/18 | 1段アイコン操作の統一 | ✅ 反映済み |
| §7-D レベル6択＋1段操作 | Tier1 | 02/03 | 未/0/1/2/3/4・アイコン化 | ✅ 反映済み |
| §3-1 ランダム多本化 | Tier1 | 06 | シャッフル＋5/10/15/20 | ✅ 反映済み |
| §3-2 AVP スコア公式統一 | AVP | 16/18 | 整数 pt＋総合順位 | ✅ 反映済み |
| §3-3 スコア桁の見せ方 | ランキング/検索 | 21/26 | 整数3桁区切り（式不変） | 対応不要 |
| §3-4 サンプルDB接続前 API 束 | （UI 外） | — | 画面に現れない | ⏸ 延期（本体作業・必要性未確定） |

## レビュー依頼ポイント

以下はいずれも**実装済み**です。スクリーンショットで最終確認をお願いします。

- Tier1 のカード/テーブル/ページャ方針（`02`/`03`・ページサイズ 50/100/200 と前後送りの粒度）。
- Tier1 のフィルタ・並び替え Popover 方針（`04`/`05`・項目とデフォルト「判定済みを薄くする」ON）。
- Tier1 のレベル選択に Lv0 を含める点（`02`・未/0/1/2/3/4 の6択で確定）。
- AVP のスコア表示を公式再計算へ寄せた結果（`16`/`18`・桁感がランキング/検索と一致）。
- 検索/ランキングの詳細フィルタの畳み方（`22b`/`27`・有効数バッジの分かりやすさ）。
- 設定の手動バックアップボタン撤去（`33`・履歴は全て自動取得表記で問題ないか）。
- あとで見るの5列（`14`・カード幅と情報密度）。
- 入れ子チロームの二重ナビ／狭幅で外側サイドバーが畳まれない点（`01`/`35`）について、ラボ表示としては許容するか、別途レイアウト調整を要するか。

## 確認環境

- OS: Windows 11
- ブラウザ: Playwright（Chromium）
- 撮影方法: Playwright MCP（フルページ＝`fullPage`、Popover/狭幅は viewport 撮影）
- viewport / 最大化条件: **最大化相当 1920×1080**（主撮影）／レスポンシブのみ 390×844
- 起動コマンド: `cd frontend && npm run dev`（http://localhost:3000）
- 未起動サービス: FastAPI（:8000）— UI LAB モックのため不要

## 注意

- 本体画面・API・DB・設定ファイルは変更していない（スクリーンショットとレポート作成のみ）。
- 既存 `STAGE7_FEEDBACK_AUDIT.md` の構成・内容は変更していない（参照のみ）。
- 「Pull request」は略していない。「全Tier」は使わず「Tier1・Tier2を両方表示」と記載。
- 実動画名・実パス・個人情報は含まない（合成データのみ）。スクリーンショットに個人情報の写り込みが無いことを確認済み。
