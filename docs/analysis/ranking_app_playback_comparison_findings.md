# 総合ランキング APP_PLAYBACK ベース移行 — 比較レビューの所見

作成日: 2026-06-20
対象ブランチ: `analysis/app-playback-ranking-local-review-20260620`

## 0. 位置づけ・安全条件

- **本書は分析・所見のみ**。ランキング式・API・UI・DB スキーマ・migration・実 DB の履歴データは**一切変更していない**。実 DB への書き込みも行っていない。
- 数値はすべて実 DB の**読み取り専用コピー**（`sqlite3` の `mode=ro` URI + `PRAGMA query_only=ON`、`core.database.get_db_connection()` 不使用）から算出した**整数集計のみ**。
- **動画名・ファイル名・フルパス・出演者名・ローカルパス・生 timestamp・匿名対応表は本書に一切含めない。** これらを含む生成物（HTML / CSV / コピー DB / 匿名対応表）は `docs/analysis/private/`（`.gitignore` 対象）にローカル保持し、公開リポジトリには収録しない。
- 先行分析の用語・前提は `ranking_fairness_multifactor_next_actions.md` / `ranking_bulk_viewing_history_investigation.md` に従う。本書はその上で「現行 vs APP のみ」「再生可能だけ vs 全動画」の体感比較に焦点を当てた所見である。

---

## 1. 背景と目的

ClipBox の総合ランキングは「いつも同じ動画が上位」「期間を変えても順位が変わらない」という体感劣化がある。主変数 `view_days`（視聴日数）が、過去にだけ記録された旧 `FILE_ACCESS_DETECTED`（`viewed_at = st_atime` 由来・少数日に集中するバルク）に大きく支配されていることが先行分析で判明している。

ユーザー方針は確定済み:

- 総合ランキングは **`APP_PLAYBACK`（アプリ内実再生）ベース**に寄せる。
- **`FILE_ACCESS_DETECTED` はスコアリングで無視**する（ただし**履歴は削除しない**。将来はフラグで除外する設計）。
- 今回はまだ**本番実装しない**。実動画名つきのローカル確認で体感を見たうえで判断する。

本書の目的は、その判断材料として **現行ランキングと「APP のみ」ランキングがどれだけ変わるか**、および **「再生可能だけ」と「全動画」でどう見え方が変わるか**を、再現可能な集計として残すことである。

---

## 2. 方法

### 2.1 スコア式（本番一致）

本番 `core/analysis_service.py::get_ranked_videos_for_tab` の composite 式をコピー DB 上で複製した。

```
composite = int( (view_days · 1 + likes · 3) · (1 + 0.5·t1 + 0.3·t2) · 100 )
```

- `t1` = 判定済み（`current_favorite_level >= 0`）、`t2` = 選別済み（`is_selection_completed = 1`）。
- `score > 0` のみランキング対象。タイブレーカー `score DESC → last_viewed_at DESC → id ASC`。

### 2.2 「現行」と「APP のみ」の定義

| ランキング | view_days / view_count | likes / Tier1 / Tier2 | FILE_ACCESS の扱い |
|---|---|---|---|
| **現行（baseline）** | 全 method 合算 | 現行どおり | スコアに**含む** |
| **APP のみ** | `APP_PLAYBACK` 行のみで再計算 | 現行と**同一** | スコアから**除外**（表示用には保持） |

- 「APP のみ」は、先行分析の候補 **C4/C5（`APP_PLAYBACK_ONLY` / `EXCLUDE_FILE_ACCESS`）** と同義。本 DB は `MANUAL_ENTRY = 0` のため両者は同値。
- **`APP_PLAYBACK` 行（実再生）は 1 件も除外していない。** 除外しているのは旧 `FILE_ACCESS_DETECTED` のみ。

### 2.3 スコープ

- **再生可能だけ**: `is_available = 1`（外付け HDD 接続済みなど、いま実際に再生できる動画。現行 UI の既定スコープ）。
- **全動画**: `is_deleted = 0`（外付け HDD 未接続の `is_available = 0` も含む）。

---

## 3. データ母数

| 項目 | 値 |
|---|---:|
| `viewing_history` 総行数 | 6,725 |
| └ `APP_PLAYBACK` | 1,282（19.1%） |
| └ `FILE_ACCESS_DETECTED` | 5,443（**80.9%**） |
| └ `MANUAL_ENTRY` | 0 |
| `videos`（`is_deleted = 0`） | 4,103 |
| 利用可能（`is_available = 1`） | 221 |
| └ スコア付き（現行 composite > 0） | 208 |
| └ スコア付き（APP のみ composite > 0） | 189 |

**読み取り**: 履歴の 5 行に 4 行が旧 `FILE_ACCESS_DETECTED`。現行 `view_days` はこの偏った母集団の上に成り立っている。利用可能 221 本のうち、APP のみに切り替えるとスコア付きは 208 → 189 本（FILE のみで支えられていた約 19 本が圏外化）。

---

## 4. 主要な所見

### 4.1 現行は旧 FILE が view_days を支配 → 上位固定化の主因

履歴の 80.9% が `FILE_ACCESS_DETECTED`。現行 composite の `view_days` 項はこの偏りを直接受けるため、上位の顔ぶれが「実再生」ではなく「旧ファイルアクセス日数」で決まりやすい。これが「いつも同じ動画」「期間で動かない」体感と整合する。

### 4.2 APP のみへ寄せると Top100 が大きく再編される

現行ランキングと「APP のみ」ランキングの **Top-N 入替数**（基準 Top-N のうち候補 Top-N から外れた件数）:

| スコープ | Top50 入替 | Top100 入替 |
|---|---:|---:|
| 再生可能だけ（`is_available=1`） | 21 | 40 |
| 全動画（`is_deleted=0`） | 25 | 47 |

- 全動画スコープの **25 / 47** は、先行分析（`ranking_fairness_multifactor_next_actions.md` 表10.2 の C4/C5・`all_not_deleted`）の **25 / 47** と一致し、**再現性**を確認した。
- 再生可能だけスコープでも Top100 の **40 件（= 約 4 割）** が入れ替わる。**実再生ベースで意味のある再編**が起きる。

### 4.3 旧 FILE で押し上がっていた動画が後退する

再生可能だけスコープでの順位移動:

| 指標 | 件数 |
|---|---:|
| 現行 Top50 にいたが APP のみで Top50 圏外へ | 21 |
| APP のみで新たに Top50 入り | 21 |
| APP のみで +20 位以上 下落（現行 Top100 内） | 46 |

上位の席が、旧ファイルアクセスで押し上がっていた動画から、実際にアプリで再生されている動画へ入れ替わる方向に動く。

### 4.4 availability（外付け HDD 未接続）も独立した大きな要因

| 指標 | 件数 |
|---|---:|
| 「再生可能だけ」Top50 ↔「全動画」Top50（APP のみ）の入替 | 30 |
| 「全動画」APP のみ Top100 のうち `is_available = 0`（利用不可） | 30 |

ライブラリの大半は外付け HDD にあり、未接続だと `is_available = 0` でランキングから消える。全動画 APP Top100 の 30 件が利用不可＝**可視ランキングは実質「いま接続中のストレージ内ランキング」**になっている。これは FILE 汚染とは独立した、別軸の体感要因。全動画モードで `is_available = 0` を表示しつつグレーアウトすると、この断面を壊さず確認できる。

### 4.5 genuine な実再生は無傷

「APP のみ」案は `APP_PLAYBACK` 行を 1 件も除外しない（除外は旧 FILE のみ）。順位が動くのは「実再生で稼いだ分」が消えるからではなく、「旧ファイルアクセスで水増しされていた分」が外れるから。**履歴は削除せず、スコアリングからのみ外す**というユーザー方針と整合する。

---

## 5. C1 高信頼バルクの位置づけ

C1 = `EXACT_TIMESTAMP_GE5_LEGACY_FILE_ACCESS`:

- 同一 `viewed_at` 完全一致グループの `group_size >= 5` ∧ `viewing_method = 'FILE_ACCESS_DETECTED'` ∧ `viewed_at < '2026-06-10 00:00:00'`（AVP 履歴記録開始前）。
- 本 DB で **11 群 / 63 行 / 61 動画・`APP_PLAYBACK` 混入 0**（先行分析と一致）。

`FILE_ACCESS_DETECTED` の `viewed_at` はファイルの `st_atime`（OS 最終アクセス時刻）由来で、5 件以上が秒単位で一致するのは人の個別視聴では作れず、1 回の機械的ファイル操作の指紋。現行 AVP は最大 4 本なので、APP 側の正当な完全一致（2〜4 件）とは `FILE ∧ pre-AVP` ガードで区別できる。

**今回の位置づけ**: ユーザー方針では C1 だけでなく `FILE_ACCESS_DETECTED` 全体をスコアから無視するため、C1 は今回の本命除外対象ではない。**(1) 旧 FILE 履歴を信用しない判断の根拠、(2) 将来の `bulk_reason` 監査フラグ、(3) 回帰テスト用の強いケース**として扱う。

---

## 6. 結論

- 現行ランキングは旧 `FILE_ACCESS_DETECTED`（履歴の 80.9%）に支配されており、上位固定化の主因になっている。
- **「APP のみ」案は genuine な実再生を保ったまま Top100 の約 4〜5 割を再編**＝意味のある正常化であり、ユーザーの体感問題に直接効く方向。
- `FILE_ACCESS_DETECTED` は**削除せず表示・分析用に残し、スコアからのみ除外**するのが妥当（C4/C5 と同義だが、物理削除はしない）。
- **availability（外付け HDD 未接続）は FILE 汚染とは独立した、もう一つの大きな体感要因**。「再生可能だけ / 全動画」切替＋全動画モードのグレーアウトで扱うのが自然。

---

## 7. 次に本番実装へ進む場合の候補

1. `FILE_ACCESS_DETECTED` を削除せず、スコアリング除外フラグを付ける。
2. 総合ランキングで `APP_PLAYBACK` のみを使って `view_days` / `view_count` を計算する。
3. `FILE_ACCESS_DETECTED` は表示用・分析用には残す。
4. C1 を `bulk_reason = EXACT_TIMESTAMP_GE5_LEGACY_FILE_ACCESS` として残す。
5. 総合ランキング画面に「再生可能だけ / 全動画」切替を追加する。
6. 全動画モードでは `is_available = 0` を Variant J と同様にグレーアウトする。

なお「発掘 / 新鮮味 / 最近見てない」は総合ランキングには混ぜない（必要なら別機能・別導線で扱う）。

---

## 8. 今回やっていないこと（明示）

- ランキング式・API・UI・DB スキーマ・migration の変更。
- `viewing_history` の DELETE / UPDATE、実 DB の物理削除・書き込み。
- 動画名・個人情報の公開出力（本書は集計値のみ）。
- ランキングからの除外の本番反映（今回は比較・所見のみ）。

---

## 9. 参照とローカル生成物

公開資料:

- [`ranking_fairness_multifactor_next_actions.md`](ranking_fairness_multifactor_next_actions.md) — 多角分析（精度・可逆性・効果の評価軸、C1〜C8）。
- [`ranking_bulk_viewing_history_investigation.md`](ranking_bulk_viewing_history_investigation.md) — バルク汚染（完全一致・短時間クラスター）調査。
- [`ranking_fairness_notes.md`](ranking_fairness_notes.md) — 公平化分析メモ。

ローカル専用（`.gitignore` 対象・**公開しない**）:

- 実動画名つきの比較 HTML（6 セクション: 現行 / APP のみ / 再生可能だけ vs 全動画 / 全動画グレーアウト / FILE 押し上げ落下 / C1 一覧）。
- 再現スクリプト、per-video CSV、集計 JSON、読み取り専用コピー DB、匿名対応表。

いずれも視聴行動メタデータ（timestamp・件数・video_id）や動画実名を含むため、`docs/analysis/private/` にローカル保持し本リポジトリ（public）には収録しない。本書の数値は名前を含まない集計 JSON と既存公開分析から転記している。
