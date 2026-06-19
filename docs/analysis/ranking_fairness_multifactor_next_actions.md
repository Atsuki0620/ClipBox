# ランキング体感改善 多角分析 — 次の一手の選定

作成日: 2026-06-19
対象ブランチ: `analysis/ranking-fairness-multifactor-20260619`
位置づけ: 分析・提案のみ。**ランキング式・API・UI・DB スキーマ・履歴データは一切変更していない。**

---

## 1. 分析目的

ClipBox のランキング（`/api/ranking` → `core/analysis_service.py::get_ranked_videos_for_tab`）について、
「効きそう（体感改善）／壊しにくい（安全性）／根拠が強い」の 3 軸で 8 候補を**再現可能に定量比較**し、
**次に実装する候補を選べる状態**にする。今回はランキング式や UI を変更しない。

ランキングの中核は次の 2 つ:

- `view_days = COUNT(DISTINCT DATE(viewed_at))`（viewing_history 基準）
- `composite = int((view_days·1 + likes·3)·(1 + 0.5·t1 + 0.3·t2)·100)`
  （`t1`=判定済み Lv≥0、`t2`=選別済み `is_selection_completed`、UI 既定の種別）

この `viewed_at` には archived な `FILE_ACCESS_DETECTED`（旧ファイルアクセス検知）由来のレガシー行が
大量に混じる。本分析はその影響と、各クリーニング候補の効果・副作用を測る。

## 2. 前提（コードと履歴から確認済み）

- 現在 viewing_history に書かれるのは `APP_PLAYBACK` のみ（`play_video()` 単発 / `record_avp_viewing()` AVP 一括）。
  `FILE_ACCESS_DETECTED` / `MANUAL_ENTRY` は Phase 1 で archived（既存行は保持）。
- AVP は最大 4 本同時再生。`record_avp_viewing()` は同一 `viewed_at` で最大 4 行を一括 INSERT する
  → **完全一致 2〜4 件には正当な AVP 履歴が含まれ得る**。**完全一致 5 件以上は現行 AVP では説明できない。**
- `pre_avp 境界 = 2026-06-10 00:00:00`（commit `8bf84fb` で AVP 履歴記録＝`APP_PLAYBACK` 化が始まった日時）。
- 本番の availability スコープは「利用可能のみ / すべて」のみ。本書の `c_drive_only` / `external_hdd_only` /
  `all_not_deleted` は**分析専用レンズ**（本番 UI には存在しない）。

## 3. 使用した DB コピーの作成方針

- 実 DB (`data/videos.db`) には**接続しない**。コピー `docs/analysis/private/videos_private_20260619_224612.db`
  を作成し、`sqlite3.connect("file:…?mode=ro", uri=True)` + `PRAGMA query_only=ON` で**読み取り専用**で開いた。
- `core.database.get_db_connection()` は使わない（実 DB ポイントのため完全隔離）。
- 読み出した列は id・状態列・`viewing_history(id/video_id/viewed_at/viewing_method)`・`storage_location`・
  `likes` に限定。

### ベースライン（コピー DB スナップショット）

| 項目 | 値 |
|---|---:|
| videos（is_deleted=0） | 4,103 |
| viewing_history 総行数 | 6,725 |
| └ `APP_PLAYBACK` | 1,282 |
| └ `FILE_ACCESS_DETECTED` | 5,443 |
| └ `MANUAL_ENTRY` | 0 |
| post-AVP 行（≥2026-06-10） | 131（**全て APP_PLAYBACK**） |
| pre-AVP の APP 行 | 1,151 |
| likes（動画数 / 行数） | 67 / 91 |
| viewed_at 範囲 | 2026-01-02 〜 2026-06-18 |

スコープ別の母数（動画数 / composite>0 の採点対象数）:

| scope | videos | scored(composite>0) |
|---|---:|---:|
| available_only (is_available=1) | 221 | 208 |
| all_not_deleted | 4,103 | 1,085 |
| c_drive_only | 321 | 294 |
| external_hdd_only | 3,782 | 791 |

## 4. 個人情報・動画情報を公開しないための安全措置

- 実 DB 無接続・読み取り専用コピーのみ。動画名 / フルパス / 出演者 / ローカルメディアパスは**出力に含めない**。
- 公開レポート（本ファイル）は **匿名 ID（`V001…`）と集計値のみ**。匿名対応表は
  `docs/analysis/private/anon_id_map.csv`（gitignore・ローカル専用）。
- Notebook / スクリプト / CSV / DB コピー / 対応表は `docs/analysis/{notebooks,data,private}/`（すべて `.gitignore` 対象）
  かつ OneDrive 非同期の作業ツリー（`C:/tmp/...`）に置く。

---

## 5. 分析した候補一覧

| ID | 名称 | 種別 | 一言 |
|---|---|---|---|
| C1 | `EXACT_TIMESTAMP_GE5_LEGACY_FILE_ACCESS` | 行除外 | 完全一致≥5・FILE・pre-AVP。高信頼バルク |
| C2 | `EXACT_2_4_FILE_ACCESS_PRE_AVP` | 監査 | 完全一致2〜4・FILE・pre-AVP。広め・弱め |
| C3 | `SHORT_CLUSTER_60S_GE5/GE10` | 監査 | 60秒クラスター。広すぎ |
| C4 | `APP_PLAYBACK_ONLY` | 比較ビュー | APP のみで再ランキング |
| C5 | `EXCLUDE_FILE_ACCESS`（全除外） | 比較ベースライン | 本 DB では MANUAL=0 のため C4 と同値 |
| C6 | `WEIGHT_DOWN_FILE`（0.25 / 0.50） | 重み下げ | FILE 日を減点。除外しない |
| C7 | `GENUINE_VIEW_DAYS`（a=C1のみ / b=C1+C3） | スコア変数 | 「信頼できる視聴日数」 |
| C8 | `AVAILABILITY_SCOPE` | スコープ | 外付けHDD未接続バイアス |

---

## 6. 表1: 候補ルール比較

headline スコープ = `all_not_deleted`・種別 = `composite`。`safety`/`evidence`/`ux` は 5 段階（5 が最良/最強/最大）。

| candidate_id | candidate_name | target_rows | uniq_videos | app_rows | file_rows | pre_avp_rows | top50_chg | top100_chg | spearman_top100 | safety | evidence | ux_impact | recommendation |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|:--:|:--:|:--:|---|
| C1 | EXACT_TIMESTAMP_GE5_LEGACY_FILE_ACCESS | 63 | 61 | 0 | 63 | 63 | 0 | 0 | 0.996 | 5 | 5 | 1 | **採用**（flag/reason のみ） |
| C2 | EXACT_2_4_FILE_ACCESS_PRE_AVP | 340 | 220 | 0 | 340 | 340 | — | — | — | 3 | 3 | 1 | 監査のみ |
| C3_5 | SHORT_CLUSTER_60S_GE5 | 4,662 | 1,001 | 0 | 4,662 | 4,662 | — | — | — | 2 | 2 | — | 監査のみ |
| C3_10 | SHORT_CLUSTER_60S_GE10 | 4,546 | 1,001 | 0 | 4,546 | 4,546 | — | — | — | 2 | 2 | — | 監査のみ |
| C4/C5 | APP_PLAYBACK_ONLY / EXCLUDE_FILE_ACCESS | 5,443 | 1,020 | 0 | 5,443 | 5,443 | 25 | 47 | 0.820 | 1 | 3 | 4 | 比較ビューのみ |
| C6_025 | WEIGHT_DOWN_FILE_0.25（除外なし） | 5,443※ | — | 0 | 5,443 | 5,443 | 13 | 23 | 0.858 | 4 | 3 | 3 | **次分析（本命）** |
| C6_050 | WEIGHT_DOWN_FILE_0.50（除外なし） | 5,443※ | — | 0 | 5,443 | 5,443 | 14 | 22 | 0.862 | 4 | 3 | 3 | 次分析 |
| C7a | GENUINE_VIEW_DAYS（C1のみ除外） | 63 | 61 | 0 | 63 | 63 | 0 | 0 | 0.996 | 5 | 5 | 1 | = C1 と同値 |
| C7b | GENUINE_VIEW_DAYS（C1+C3除外） | 4,546 | 1,001 | 0 | 4,546 | 4,546 | 21 | 50 | 0.843 | 2 | 3 | 4 | 次分析（要注意） |
| C8 | AVAILABILITY_SCOPE | 3,782※※ | 3,782 | — | — | — | (別軸) | — | — | 4 | 4 | 5 | **次分析（別トラック）** |

※ C6 は**除外でなく重み下げ**（5,443 行を減点・行は残る）。
※※ C8 は除外でなく**スコープ設計**（外付けHDD 3,782 本が `is_available=0` でランキング非表示）。

**読み取り:**
- **C1 = 唯一の高信頼・低リスク・高根拠候補。だが体感インパクトは実質ゼロ（Top50 入替 0、Spearman 0.996）。** 隔離の土台。
- **体感を動かす候補（C4/C5・C7b）は同時に最も危険**（Top50 を 20〜27 入替、Spearman 0.60〜0.84）。
- **C6 重み下げが「効きつつ壊しにくい」中間点**（Top50 7〜14 入替、Spearman 0.75〜0.86、除外せず可逆）。
- **C8（availability）は別軸で最大の体感ポテンシャル**（ライブラリの 92% が不可視）。汚染対策だけでは不足。

## 7. 表2: ランキング影響比較（scope × ranking_type）

`composite`（本番既定種別）。`likes` は**全候補で不変（Spearman 1.0）**＝いいねランキングは履歴クリーニングの影響を受けない。
`view_count` は概ね `view_days` と同傾向（C1 はほぼ不変、C4/C7b は大幅入替）。`C7a` は `C1` と同値、`C6_050`≈`C6_025`。

### composite

| candidate | available_only | all_not_deleted | c_drive_only | external_hdd_only |
|---|---|---|---|---|
| C1 | 0 / 0 / 0.998 | 0 / 0 / 0.996 | 0 / 0 / 0.998 | 0 / 1 / 0.997 |
| C6_025 | 12 / 16 / 0.753 | 13 / 23 / 0.858 | 12 / 16 / 0.753 | 7 / 17 / 0.825 |
| C6_050 | 11 / 13 / 0.760 | 14 / 22 / 0.862 | 12 / 15 / 0.760 | 9 / 25 / 0.839 |
| C4/C5 | 22 / 40 / 0.601 | 25 / 47 / 0.820 | 22 / 41 / 0.601 | 24 / 60 / 0.607 |
| C7b | 20 / 27 / 0.618 | 21 / 50 / 0.843 | 20 / 29 / 0.618 | 27 / 48 / 0.618 |

（各セル = `Top50入替 / Top100入替 / Top100 Spearman`）

### view_days

| candidate | available_only | all_not_deleted | c_drive_only | external_hdd_only |
|---|---|---|---|---|
| C1 | 1 / 0 / 1.000 | 1 / 1 / 0.999 | 1 / 0 / 1.000 | 0 / 2 / 0.994 |
| C6_025 | 12 / 17 / 0.825 | 13 / 25 / 0.700 | 13 / 20 / 0.825 | 12 / 24 / 0.651 |
| C4/C5 | 30 / 44 / 0.604 | 31 / 63 / 0.562 | 31 / 51 / 0.604 | 27 / 59 / **0.229** |
| C7b | 32 / 42 / 0.653 | 27 / 63 / 0.630 | 32 / 48 / 0.653 | 33 / 50 / **0.298** |

**注目:** `composite` は `likes·3` と T1/T2 ボーナスが緩衝するため、クリーニングに対して**生 `view_days` より頑健**。
生 `view_days` は external_hdd で Spearman 0.23〜0.30 まで崩れる（C4/C7b）。
→ 体感改善を狙うなら生 view_days の自動除外は危険、composite ベースの段階導入の方が安全。

`available_only` と `c_drive_only` の数値がほぼ一致するのは、**現行の可視ランキングが実質 C ドライブランキングだから**（C8）。

## 8. 表3: スコア寄与分解（baseline composite Top50・all_not_deleted・匿名 ID）

`proposed_rank_change` = **推奨候補 C1 適用後**の順位変化（+ は下落、- は上昇、0 は不変）。

| anon_id | rank | score | app_vd | file_vd | susp_vd | likes | t1 | t2 | storage | avail | C1後Δ |
|---|---:|---:|---:|---:|---:|---:|:--:|:--:|---|:--:|---:|
| V001 | 1 | 5400 | 7 | 23 | 0 | 2 | 1 | 1 | C_DRIVE | 1 | 0 |
| V002 | 2 | 5220 | 6 | 18 | 0 | 3 | 1 | 1 | C_DRIVE | 1 | 0 |
| V003 | 3 | 4860 | 4 | 20 | 0 | 2 | 1 | 1 | EXTERNAL_HDD | 0 | 0 |
| V004 | 4 | 4320 | 7 | 20 | 0 | 1 | 1 | 1 | C_DRIVE | 1 | 0 |
| V005 | 5 | 4200 | 6 | 16 | 0 | 3 | 1 | 0 | C_DRIVE | 1 | 0 |
| V006 | 6 | 4140 | 4 | 15 | 0 | 2 | 1 | 1 | C_DRIVE | 1 | 0 |
| V007 | 7 | 4140 | 3 | 16 | 0 | 2 | 1 | 1 | C_DRIVE | 1 | 0 |
| V008 | 8 | 4140 | 7 | 16 | 0 | 2 | 1 | 1 | C_DRIVE | 1 | 0 |
| V009 | 9 | 3780 | 2 | 14 | 0 | 2 | 1 | 1 | C_DRIVE | 1 | 0 |
| V010 | 10 | 3780 | 3 | 18 | 0 | 1 | 1 | 1 | EXTERNAL_HDD | 0 | 0 |
| V011 | 11 | 3750 | 6 | 18 | 1 | 2 | 1 | 0 | C_DRIVE | 1 | **+3** |
| V012 | 12 | 3600 | 2 | 16 | 1 | 1 | 1 | 1 | C_DRIVE | 1 | -1 |
| V013 | 13 | 3600 | 5 | 14 | 1 | 2 | 1 | 1 | EXTERNAL_HDD | 0 | -1 |
| V014 | 14 | 3600 | 4 | 10 | 0 | 3 | 1 | 1 | EXTERNAL_HDD | 0 | -1 |
| V015 | 15 | 3420 | 2 | 15 | 0 | 1 | 1 | 1 | EXTERNAL_HDD | 0 | 0 |
| V016 | 16 | 3420 | 2 | 12 | 0 | 2 | 1 | 1 | EXTERNAL_HDD | 0 | 0 |
| V017 | 17 | 3420 | 7 | 18 | 0 | 0 | 1 | 1 | EXTERNAL_HDD | 0 | 0 |
| V018 | 18 | 3300 | 3 | 16 | 0 | 2 | 1 | 0 | C_DRIVE | 1 | 0 |
| V019 | 19 | 3300 | 4 | 16 | 2 | 2 | 1 | 0 | C_DRIVE | 1 | 0 |
| V020 | 20 | 3150 | 4 | 17 | 1 | 1 | 1 | 0 | C_DRIVE | 1 | 0 |
| V021 | 21 | 3060 | 4 | 17 | 1 | 0 | 1 | 1 | EXTERNAL_HDD | 0 | **+8** |
| V022 | 22 | 3060 | 2 | 13 | 0 | 1 | 1 | 1 | C_DRIVE | 1 | -1 |
| V023 | 23 | 3060 | 1 | 14 | 0 | 1 | 1 | 1 | C_DRIVE | 1 | -1 |
| V024 | 24 | 3060 | 1 | 14 | 0 | 1 | 1 | 1 | C_DRIVE | 1 | -1 |
| V025 | 25 | 3060 | 1 | 14 | 0 | 1 | 1 | 1 | EXTERNAL_HDD | 0 | -1 |
| V026 | 26 | 3060 | 1 | 17 | 0 | 0 | 1 | 1 | C_DRIVE | 1 | -1 |
| V027 | 27 | 3060 | 1 | 14 | 0 | 1 | 1 | 1 | EXTERNAL_HDD | 0 | -1 |
| V028 | 28 | 3000 | 3 | 9 | 0 | 3 | 1 | 0 | C_DRIVE | 1 | -1 |
| V029 | 29 | 2880 | 2 | 13 | 0 | 1 | 1 | 1 | EXTERNAL_HDD | 0 | -1 |
| V030 | 30 | 2880 | 1 | 16 | 0 | 0 | 1 | 1 | C_DRIVE | 1 | 0 |
| V031〜V050 | 31–50 | 2880–2700 | 0–4 | 8–17 | 0 | 0–2 | 1 | 0/1 | mix | mix | 0 |

（V031 以降の全行は `susp_vd=0`・`C1後Δ=0`。完全版は `docs/analysis/data/table3_top50_decomp.csv`。）

**読み取り:**
- Top50 の `view_days` は **`file_vd`（FILE_ACCESS 由来）が `app_vd`（アプリ再生由来）を大きく上回る**
  （例 V050: app=0 / file=15、V026: app=1 / file=17）。**現行上位は「アプリで実際に再生した日数」ではなく
  「旧ファイルアクセス検知日数」で決まっている**ことが体感劣化の本質。
- だが C1 の `susp_vd` は Top50 でほぼ 0（50 行中 6 行のみ 1〜2）。**C1 を適用しても Top50 はほとんど動かない**
  （13 行が ±1〜+8 程度、上位 10 は不変）。C1 は「明らかな旧バルクの隔離」であって「体感の作り直し」ではない。
- Top50 は `t1=1`（判定済み）がほぼ全件、`t2=1`（選別済み）が多数。`available=0`（外付けHDD）も約半数を占め、
  本番の `available_only` ではこれらが消える（C8）。

## 9. 安全性評価

| 観点 | 結論 |
|---|---|
| APP_PLAYBACK を巻き込むか | **C1/C2/C3/C7 は巻き込まない**（対象の app_rows=0）。完全一致≥5 グループ内の APP 行は**全 DB で 0 件**。 |
| AVP 正当 2〜4 件を巻き込むか | **C1 は巻き込まない**。post-AVP の APP 完全一致グループは**全て size=4**（6 セッション・24 行）で AVP 上限と一致。完全一致≥5 に APP は 1 件も無い。生 `exact≥2` だとこの 24 行を誤検出するが、`FILE ∧ pre-AVP` ガードで回避。 |
| 既存 DB を壊すか | 全候補とも**読み取り専用コピーのみ**で検証。実 DB・履歴は無変更。 |
| 現行 API/UI 仕様を壊すか | 本書は分析のみ。推奨初手も**flag/reason 付与のみでランキング除外しない**ため API/UI 不変。 |
| ランキングが変わりすぎないか | C1=ほぼ不変で安全。C4/C5/C7b=変わりすぎ（Spearman 0.6 前後・生 view_days で 0.23）。C6=中間（0.75〜0.86）。 |
| 後から戻せるか | C1/C6 は flag・重みなので可逆。C4/C5 の「FILE 全除外」は**過去の正当視聴も消すため実質非可逆**。 |
| 初回を flag/reason に分離できるか | **できる**（C1）。派生テーブル/ビューで `bulk_reason` を付与し、ランキング除外は後続 PR に分離。 |

## 10. 根拠の強さ評価

| 観点 | 結論 |
|---|---|
| Git 履歴・仕様・コード挙動と整合 | ◎ `record_avp_viewing()`（≤4 行・同一 viewed_at・APP_PLAYBACK）と `play_video()`（APP）から、完全一致≥5 は現行経路で生成不能。 |
| FILE_ACCESS の archived 扱いと整合 | ◎ FILE_ACCESS は現在書かれず、C1/C2/C3 対象は全て FILE_ACCESS かつ pre-AVP。 |
| 2026-06-10 境界と整合 | ◎ post-AVP 行（131）は**全て APP**。C1/C2/C3 対象は全て pre-AVP。 |
| 同一 timestamp 件数と AVP 上限の整合 | ◎ APP 完全一致は最大 size=4（AVP 上限）。FILE 完全一致は 5〜8 まで到達（旧一括記録の痕跡）。 |
| APP 混入の分離可能性 | ◎ C1（exact≥5）は APP と**完全分離**。C2 も FILE∧pre-AVP ガードで AVP と分離。 |
| 統計的に過剰検出でないか | C1 は 63 行（0.9%）に限定で過剰検出ではない。C3（60秒≥10）は 4,546 行=**67.6%** と過剰、自動除外不可。 |

**根拠の強さ順位:** C1 = C7a（最強） > C8（is_available 仕様は明確） > C4/C5（APP=現行有効方式は妥当だが FILE 全否定が弱点）
> C2 ≈ C3 ≈ C6（閾値・重みが恣意的）。

## 11. 体感改善の期待評価

| 候補 | 体感改善の期待 | 根拠 |
|---|---|---|
| C1 / C7a | **ほぼ無し**（土台） | Top50 入替 0・Spearman 0.996。明らかな旧バルクを隔離するだけ。 |
| C6（重み下げ） | **中**（本命の起点） | Top50 7〜14 入替・Spearman 0.75〜0.86。FILE 偏重を緩めつつ順位の連続性を保つ。可逆・説明容易。 |
| C4/C5（APP のみ） | 大だが危険 | Top50 20〜25 入替。だが「過去の正当な FILE_ACCESS 視聴」も全消去。比較ビュー向き。 |
| C7b（genuine 60秒版） | 大だが危険 | Top50 21〜27 入替。実質 C3 自動除外で生 view_days の Spearman が 0.3 まで崩れる。 |
| C8（availability） | **最大** | 外付けHDD 3,782 本（92%）が不可視。接続有無という物理的偶然が上位を支配。別軸で最大ポテンシャル。 |

「いつも同じ動画」「期間を変えても順位が変わらない」体感の主因は、**(a) FILE_ACCESS 偏重の view_days** と
**(b) is_available による外付けHDD 不可視化** の複合。C1 単体では (a) のごく一部しか動かないため、
**体感改善の本命は C6（重み下げ）と C8（availability 設計）の追加分析**にある。

---

## 12. 推奨する次の一手

### 最有力（最初の小 PR）

- **`EXACT_TIMESTAMP_GE5_LEGACY_FILE_ACCESS`（C1）の flag/reason 化のみ**。**ランキング除外はまだしない。**
- 派生テーブル/ビュー or 集計時フラグで `bulk_reason = 'EXACT_TIMESTAMP_GE5_LEGACY_FILE_ACCESS'` を付与。
- **APP/AVP 保護テストを追加**（完全一致≥5 に APP 行が無いこと／AVP 完全一致は size≤4 であることを回帰で固定）。
- 根拠最強・安全最大。体感インパクトは限定的だが、後続のクリーニング/重み下げの**安全な土台**になる。

### 次点の分析タスク（体感改善の本命はこちら）

1. **C6 重み下げの感度分析**（FILE day=0.25/0.5、C1 day=0、C3 day=0.25）。除外より安全で体感が動く中間案。
   `composite` ベースで Top50 7〜14 入替・Spearman 0.75〜0.86。本書の数値を起点に係数を詰める。
2. **C8 availability 設計**（「接続中のみ / 全動画 / 外付けHDD含む参考ランキング」の分離、`last_known_score` 保存）。
   別軸で最大の体感ポテンシャル。汚染対策と独立に進められる。
3. **C4（APP_PLAYBACK のみランキング）と現行の比較ビュー**を分析内に追加（本実装ではなく比較用）。
4. **C7（genuine_view_days）の定義を C1 ティア化**で再評価。60秒クラスター版（C7b）は危険なので採らない。

### まだやらないこと

- `FILE_ACCESS_DETECTED` の全除外（C5）／短時間クラスター（C3）の自動除外
- UI トグルの即追加
- ランキング式の即変更
- DB 履歴の削除・UPDATE

---

## 13. 表4: 採用しない候補と理由

| 候補 | 採用しない理由 | 巻き込む危険 | 監査候補として残すか | 将来再検討の条件 |
|---|---|---|---|---|
| C2（exact 2〜4・FILE・pre-AVP） | 340 行/220 動画と広く、2〜4 件一致は 5 件以上より根拠が弱い | （ガードにより AVP は回避）正当な近接ファイルアクセスを誤判定し得る | **残す**（audit flag） | C1 運用後に監査表で人手確認し、誤検出率が低いと確認できた場合のみ |
| C3（60秒クラスター ≥5/≥10） | 4,546〜4,662 行=67.6% と過大。自動除外で生 view_days の Spearman が 0.23〜0.30 まで崩壊 | 正当な連続視聴・まとめ見を大量に巻き込む | **残す**（audit flag のみ） | クラスター内 method 構成や前後行から「スキャン副産物」と人手で確証できる部分集合に限定できた場合 |
| C4/C5（APP のみ / FILE 全除外） | 過去の正当な FILE_ACCESS 視聴も全消去。実質非可逆。Top50 を 22〜25 入替 | FILE 期（2026-01〜06-09）の本物の視聴履歴を全否定 | 比較ビューとしてのみ | 「本物の FILE 視聴」と「スキャン副産物」を分離する別シグナルが確立した場合 |
| C7b（genuine 60秒版） | 実質 C3 自動除外。生 view_days の Spearman 崩壊 | C3 と同じ | 分析比較のみ | C7 を C1 ティアに限定するなら C7a として採用可 |
| ランキング式の即変更 / UI トグル即追加 | 根拠が固まる前に本番挙動を変えると戻せない | 体感が逆に悪化するリスク | — | C1 隔離 → C6/C8 分析の数値が揃ってから |

## 14. 今回は実装しないこと（明示）

- ランキング式・API・UI・DB スキーマ・migration の変更
- viewing_history の DELETE / UPDATE、実 DB の物理削除
- ランキングからの除外（C1 を含め、初手は flag/reason のみ）

---

## 付記（ローカル生成物・git 管理外）

- 分析スクリプト: `docs/analysis/notebooks/ranking_fairness_multifactor.py`
- 集計 CSV: `docs/analysis/data/{table1_candidate_compare,table2_ranking_impact,table3_top50_decomp,summary.json}.csv`
- 読み取り専用 DB コピー: `docs/analysis/private/videos_private_20260619_224612.db`
- 匿名対応表: `docs/analysis/private/anon_id_map.csv`

いずれも視聴行動メタデータ（timestamp・件数・video_id）や動画実名を含むため `.gitignore` 対象。
本リポジトリ（public）には**本 Markdown のみ**を収録する。
