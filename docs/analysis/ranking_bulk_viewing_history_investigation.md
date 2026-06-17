# viewing_history バルク汚染調査: 完全一致 + 短時間クラスター 統合メモ

作成日: 2026-06-18  
対象ブランチ: `analysis/bulk-exact-timestamp-investigation`（Round 1）, `analysis/bulk-short-cluster-round2`（Round 2）

## 1. 目的と安全条件

`viewing_history.viewed_at` の完全一致・短時間集中が、視聴回数・視聴日数・総合ランキングに  
どの程度影響しているかを確認する。DBスキーマ、ランキング式、履歴データ、UIの挙動は変更しない。

安全対策:

- 実 DB は SQLite 接続せず、DB ファイルをコピーして分析した。
- Notebook はコピー DB を SQLite URI `mode=ro` で開いた。
- 読み出し列は `video_id`・状態列・視聴履歴 ID・時刻・method に限定した。
- 出力に動画名・フルパス・出演者・ローカルメディアパスを含めない。
- DB スキーマ・API・UI・ランキング式・履歴データ・`CHANGELOG.md` は変更していない。

**公開ポリシー**: この md のみ public リポジトリに収録。Notebook・CSV・JSON・コピー DB は  
視聴行動メタデータ（timestamp・件数・video_id）または動画実名を含むため local-only とする  
（`docs/analysis/notebooks/`, `docs/analysis/data/`, `docs/analysis/private/` は `.gitignore` 対象）。

## 2. Provenance / 前回値との照合

Round 1 スナップショット:

- generated_at: `2026-06-17T00:xx:xx` ± （exact-timestamp notebook 実行時刻）
- db_copy_name: `videos_private_20260617_233019.db`
- `viewing_history` 総行数: 6,665

Round 2 スナップショット:

- generated_at: `2026-06-17T15:19:38.038403+00:00`
- db_copy_name: `videos_private_round2_20260617_235613.db`
- `viewing_history` 総行数: 6,665（Round 1 と一致）

照合結果: Round 1 と Round 2 は異なるコピー DB から独立に exact ルールを再計算し、  
`groups=11 / rows=63 / unique_videos=61` で完全一致した。外部前回値との直接照合は未実施。

## 3. Round 0: ベースライン

| 項目 | 値 |
|---|---|
| `viewing_history` 総行数 | 6,665 |
| `videos`（is_deleted=0） | 4,103 |
| `judgment_history` | 842 |
| `likes` | 83 |
| `play_history` | 1,110 |
| `viewed_at` NULL | 0 |
| `viewed_at` 範囲 | 2026-01-02 03:09:59 〜 2026-06-16 23:34:50 |
| `viewed_at` microsecond 付き | 全 6,665 行（`fractional_6`） |
| `FILE_ACCESS_DETECTED` | 5,443 |
| `APP_PLAYBACK` | 1,222 |
| `MANUAL_ENTRY` | 0 |

日別上位（行数）: 2026-02-04 = 708、2026-05-09 = 406、2026-02-05 = 335。

microsecond 付きで別動画が同一 `viewed_at` に並ぶ場合、偶然の通常再生より  
旧ファイルアクセス検知の一括記録を疑う根拠が強い。

## 4. Round 1: 完全一致グループ（exact timestamp）

### 閾値比較

| しきい値 | グループ | 行数 | unique videos | APP | FILE_ACCESS |
|---|---:|---:|---:|---:|---:|
| exact>=2 | 164 | 411 | 271 | 8 | 403 |
| exact>=5 | 11 | 63 | 61 | 0 | 63 |
| exact>=10 | 0 | 0 | 0 | 0 | 0 |
| exact>=20 | 0 | 0 | 0 | 0 | 0 |
| exact>=50 | 0 | 0 | 0 | 0 | 0 |

サイズ帯: 2-4件 = 153グループ・348行 / 5-9件 = 11グループ・63行 / 10件以上 = 0。

### exact>=5 の特徴

- 期間: 2026-02-15 15:40:06 〜 2026-05-10 01:29:54
- すべて `FILE_ACCESS_DETECTED`、APP 行 = 0
- すべて `viewed_at < 2026-06-10 00:00:00`（pre-AVP）
- 各グループは同一動画重複ではなく、別動画の同時刻記録
- storage: `EXTERNAL_HDD` 49行、`C_DRIVE` 14行
- 判定: 未判定 1行、Tier2選別済み 7行

### 推論

exact>=5 は AVP 上限 4 本では説明しづらく、AVP 履歴記録追加前（pre-AVP）の  
`FILE_ACCESS_DETECTED` のみで構成されるため、旧機能由来のバルク候補として信頼度が高い。  
exact>=2 は 2-4件グループが多く、現行 AVP の正当ケースを巻き込む可能性があるため除外ルールには不向き。

## 5. Round 2: 短時間クラスター精査

FILE_ACCESS_DETECTED かつ pre-AVP（`viewed_at < 2026-06-10`）に限定して  
adjacent-gap / rolling-window / span 上限の各ルールを評価した。

### クラスタールール比較（FILE pre-AVP 限定）

| rule | clusters | rows | unique videos | max observed span |
|---|---:|---:|---:|---:|
| adjacent gap<=60s min5 | 106 | 4,662 | 1,001 | 504.18s |
| rolling window 30s min5 | 116 | 4,584 | 1,001 | 192.40s |
| rolling window 60s min5 | 105 | 4,638 | 1,001 | 504.18s |
| span gap<=60s max60s min5 | 86 | 3,023 | 780 | 57.15s |
| span gap<=60s max120s min5 | 100 | 3,714 | 881 | 101.94s |

span 上限（max60s）で絞っても 3,023 rows / 780 videos。  
`all_not_deleted` の composite では 696 videos が large change になる。

### 結論

「疑わしい履歴の監査対象」としては有用だが、「自動除外してランキングから落とす」には精度不足。  
→ **監査候補（audit flag）どまり**。

## 6. APP 保護 / 長 span 連鎖 不採用

### all-method 60秒 adjacent-gap の詳細

| 指標 | 値 |
|---|---:|
| clusters | 150 |
| rows | 4,994 |
| unique videos | 1,021 |
| FILE rows | 4,783 |
| APP rows | 211 |
| APP involved clusters | 68 |
| method mixed clusters | 63 |
| pure APP clusters | 5 |
| max observed span | 546.95s |

APP 保護版（FILE 行のみ落とす）でも 4,783 rows / 1,008 videos と対象が過大。  
`available_only` composite = 169 videos、`all_not_deleted` composite = 986 videos が large change。

### APP exact timestamp 補助確認

- APP total rows: 1,222
- post-AVP APP exact timestamp size 2-4: 2グループ / 8行

APP は現行 UI の有効な視聴記録であり、自動除外に含めない。  
APP を含むクラスターは監査表示どまりとする。

### 長 span 連鎖

adjacent-gap は短い gap が連続すると 5〜9分級の長い連鎖を作る。  
all-method 60秒の最大 span = 546.95s、FILE pre-AVP でも最大 504.18s。  
span 制限は精度改善にはなるが max60s でも 3,023 rows と大きく、自動除外には使えない。

## 7. Git 履歴境界（pre_avp_boundary の根拠）

| コミット | 日付 | 内容 |
|---|---|---|
| `9efbb20` | 2026-01-02 | `feat: Add automatic file access detection for viewing history` — `core/video_manager.py` にファイルアクセス検知由来の視聴履歴記録追加 |
| `aed3378` | 2026-06-02 | `refactor: Phase 1 整理・削減` — 不要機能を archived に移し、`FILE_ACCESS_DETECTED` / `MANUAL_ENTRY` は現行機能から除外方向へ |
| `0b28283` | 2026-06-03 | `refactor: Phase 1 整理の集約` — archived 実体削除・docs 整合 |
| `8bf84fb` | 2026-06-10 | `feat: PR3 + PR4 — AVPページ再設計 + AVP再生履歴記録` — `record_avp_viewing()` により AVP 再生対象を `APP_PLAYBACK` で一括記録 |

`pre_avp_boundary = 2026-06-10 00:00:00` は、AVP 由来の `APP_PLAYBACK` が発生し始める境界日時。  
exact>=5 の全行がこの境界以前であることを確認済み。

## 8. ランキング影響

### 8-1. exact>=5 除外（Round 2 レンズ: changed/large-change）

| scope | metric | changed videos | large changes | max removed | max reduction | max Top100 rank diff |
|---|---|---:|---:|---:|---:|---:|
| available_only | view_count | 36 | 0 | 2 | 16.67% | 10 |
| available_only | view_days | 21 | 0 | 1 | 25.00% | 11 |
| available_only | composite | 16 | 1 | 150 | 25.00% | 7 |
| all_not_deleted | view_count | 113 | 0 | 2 | 33.33% | 15 |
| all_not_deleted | view_days | 63 | 0 | 1 | 33.33% | 17 |
| all_not_deleted | composite | 59 | 22 | 180 | 33.33% | 12 |
| c_drive_only | composite | 20 | 4 | 150 | 33.33% | 7 |
| external_hdd_only | composite | 76 | 18 | 180 | 33.33% | 51 |

`view_count` と `view_days` の large change = 0件。  
`composite` は低スコア帯や Top100 同点周辺で large change が出る。

### 8-2. exact>=5 除外（Round 1 レンズ: Spearman / Top-N 入替）

| scope | ranking | Top50入替 | Top100入替 | Top100 Spearman | Top100最大rank差 |
|---|---|---:|---:|---:|---:|
| available_only | view_count | 0 | 0 | 0.9982 | 10 |
| available_only | view_days | 1 | 0 | 0.9990 | 11 |
| available_only | likes | 0 | 0 | 1.0000 | 0 |
| available_only | composite | 0 | 0 | 0.9995 | 7 |
| all_not_deleted | view_count | 0 | 1 | 0.9956 | 15 |
| all_not_deleted | composite | 1 | 0 | 0.9979 | 12 |
| external_hdd_only | view_count | 0 | 3 | 0.9891 | 23 |
| external_hdd_only | composite | 0 | 1 | 0.9948 | 24 |

Top50 入替は available_only/view_days で 1件のみ。Spearman は全スコープで 0.99+ を維持。

### 8-3. exact>=5 + 60秒クラスター10件以上 除外（参考: 採用しないルール）

| scope | ranking | Top50入替 | Top100入替 | Top100 Spearman | Top100最大rank差 |
|---|---|---:|---:|---:|---:|
| available_only | view_count | 22 | 32 | 0.2597 | 84 |
| available_only | view_days | 30 | 34 | -0.0150 | 85 |
| available_only | composite | 20 | 25 | 0.3808 | 70 |
| all_not_deleted | view_count | 23 | 53 | 0.1082 | 86 |
| all_not_deleted | view_days | 30 | 60 | -0.1831 | 86 |
| external_hdd_only | composite | 27 | 49 | -0.0328 | 66 |

Spearman が 0.3 以下・負値まで落ちる。ランキングの意味が変わる水準で自動除外に不適。

## 9. 推奨ルール & 採用しないルール

### 推奨（High 信頼度）

```
EXACT_TIMESTAMP_GE5_LEGACY_FILE_ACCESS

viewing_history row が属する viewed_at 完全一致グループの group_size >= 5
AND viewing_method = 'FILE_ACCESS_DETECTED'
AND viewed_at < '2026-06-10 00:00:00'
```

結果: 11グループ / 63行 / 61 unique videos / APP 0行  
理由:
- AVP 上限 4本を保護できる
- 現行 `APP_PLAYBACK` を巻き込まない
- pre-AVP に限定できる
- ランキング影響が小さく、Top50/Top100 をほぼ保ったまま明らかな旧機能候補を隔離できる

初回 PR では **flag / reason 付与のみ**（ランキング除外は次 PR 以降）。

### 採用しないルール

| ルール | 理由 |
|---|---|
| `exact>=2` | 411行、APP 8行含む。AVP 正当ケースと 2-4件の正常一括操作を巻き込む |
| `exact>=10` | 今回 DB では該当 0行 |
| 60秒クラスター 10件以上 自動除外 | 4,610行（69.17%）、APP 64行含む。Spearman が壊れる |
| span<=60s クラスター自動除外 | 3,023 rows / 780 videos。large change = 696 videos |
| APP を含む自動除外 | APP は現行 UI の有効な視聴記録 |

## 10. 安全な実装方針

物理削除はしない。優先順:

1. 派生テーブルまたはビューで `bulk_reason` 列を付与する。
2. ランキング計算時に `bulk_reason IN (...)` を除外できる内部フラグを用意する。
3. UI トグルは初回 PR 以降。まず集計ロジックの裏側で検証可能な状態に留める。

想定する `bulk_reason` 値:

- `EXACT_TIMESTAMP_GE5_LEGACY_FILE_ACCESS`（初回 PR 対象）
- `SHORT_CLUSTER_60S_GE10_LEGACY_FILE_ACCESS_CANDIDATE`（将来検証用）

## 11. 次 PR 提案

1. **小 PR（最初）**: `EXACT_TIMESTAMP_GE5_LEGACY_FILE_ACCESS` のみ flag/reason 化。ランキング除外なし。
2. **次分析 PR**: `SHORT_CLUSTER_FILE_ACCESS_PRE_AVP_CANDIDATE` の抽出レポートを追加。自動除外はしない。
3. **将来 PR**: 派生テーブルまたはビューで `bulk_reason` を持ち、ランキング除外 ON/OFF を内部比較できるようにする。UI トグルは後回し。

## 12. 結論

Round 1・Round 2 ともに、exact timestamp（`viewed_at` 完全一致 5件以上・`FILE_ACCESS_DETECTED`・pre-AVP）が  
**唯一の高精度フラグ候補**（11グループ / 63行 / 61 unique videos、APP 混入なし）。

短時間クラスター（adjacent-gap / rolling-window / span 上限）は、FILE pre-AVP に絞っても  
3,023 rows / 780 videos 以上と広すぎるため、ランキング除外には使わず**監査候補**どまりとする。

APP を含む除外、all-method 60秒 adjacent-gap、長 span 連鎖クラスターの自動除外はすべて不採用。

---

**付記（ローカル生成物）**: 詳細な Notebook・CSV・JSON・解析コード・DB コピーは  
`docs/analysis/notebooks/`, `docs/analysis/data/`, `docs/analysis/private/` に格納済み。  
視聴行動メタデータ（timestamp・件数・video_id）および動画実名を含むため、  
プライバシー保護の観点から本リポジトリ（public）には収録しない（`.gitignore` 対象）。
