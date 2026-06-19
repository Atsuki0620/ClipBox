# ランキング体感改善 多角分析 — 次の一手の選定

作成日: 2026-06-19
対象ブランチ: `analysis/ranking-fairness-multifactor-20260619`
位置づけ: **分析・提案のみ**。ランキング式・API・UI・DB スキーマ・履歴データは一切変更していない。
扱う数値はすべて実 DB の**読み取り専用コピー**から算出した集計値で、動画名・パス・出演者・生 timestamp は
本書に一切含めない（匿名 ID と整数集計のみ）。

---

## 0. この文書の歩き方（読み方ガイド）

この文書は「ClipBox のランキングが体感的に劣化している」という問題に対して、**次にどの改善を実装すべきか**を
データで選べるようにするための分析レポートである。実装はまだ行わない。読者として **(1) レビューする人間** と
**(2) 続きを引き継ぐ将来の AI エージェント** の両方を想定し、前提知識ゼロでも追えるよう用語と手法を本書内で
完結させた。

各節の役割と読む順の目安:

| 目的 | 読む節 |
|---|---|
| 結論だけ知りたい | §1 エグゼクティブサマリー |
| なぜこの分析をするのか | §2 背景と問題意識 |
| 用語が分からない | §3 用語定義 / §4 ランキングの仕組み |
| 何を仮説に置いたか | §7 仮説 |
| どう測ったか（再現したい） | §8 分析方法 / §9 候補定義 |
| 数値そのもの | §10 結果（表1〜4） |
| 数値の意味・なぜそう言えるか | §11 考察 / §12 安全性 / §13 根拠 / §14 体感 |
| 次に何をするか | §15 推奨 / §16 不採用理由 / §17 やらないこと |

**用語の最重要 3 つ**（ここだけ先に覚えると以降が読める）:
`view_days`（視聴日数。順位の主変数）/ `composite`（本番既定のスコア式）/
`FILE_ACCESS_DETECTED`（過去にだけ書かれた「ファイルアクセス検知」由来の履歴。汚染の主因）。

---

## 1. エグゼクティブサマリー

- ランキング上位は、ユーザーがアプリで**実際に再生した日数**ではなく、過去にだけ記録された
  **旧ファイルアクセス検知（`FILE_ACCESS_DETECTED`）の日数**で大きく決まっている。これが
  「いつも同じ動画が上位」「期間を変えても順位が変わらない」という体感劣化の中心的な原因と考えられる。
- 履歴 6,725 行のうち **5,443 行（80.9%）が `FILE_ACCESS_DETECTED`**、現行アプリが書く `APP_PLAYBACK` は
  1,282 行（19.1%）のみ。`view_days` はこの偏った母集団の上に成り立っている。
- 「安全に消せる」と断言できるのは **C1（完全一致タイムスタンプ ≥5 件の旧 FILE_ACCESS バルク）= 63 行 / 61 動画**
  だけ。ただし C1 を消してもランキングはほぼ動かない（Top50 入替 0、Spearman 0.996）。**C1 は体感改善策ではなく
  「安全な土台」**である。
- **体感を実際に動かす候補ほど危険**: FILE 全除外（C4/C5）や 60 秒クラスター除外（C7b）は Top50 を 20〜27 件
  入れ替えるが、過去の正当な視聴も巻き込み、生 `view_days` の順位相関は 0.23〜0.30 まで崩れる（非可逆）。
- **「効きつつ壊しにくい」中間点は C6（FILE 日の重み下げ）**。除外せず減点するだけで Top50 を 7〜14 件動かし、
  Spearman 0.75〜0.86 を保ち、係数を変えれば**可逆**。
- もう一つの体感劣化要因は**外付け HDD の不可視化（C8）**。ライブラリ 4,103 本のうち 3,782 本（**92%**）が
  `is_available=0` でランキングに出ず、可視ランキングは実質「C ドライブ内ランキング」になっている。汚染対策とは
  独立した、最大の体感ポテンシャルを持つ別軸。

### 次の一手（このサマリーだけで判断できる粒度）

| 段階 | 内容 | 理由 |
|---|---|---|
| **初手（小 PR）** | C1 を `bulk_reason` として **flag/reason 化のみ**（ランキング除外はしない）＋ APP/AVP 保護テスト追加 | 根拠最強・安全最大。後続クリーニングの土台。体感は動かさない |
| **次点（追加分析）** | C6 重み下げの係数感度分析／C8 availability の設計分析 | ここに体感改善の本命がある。可逆で段階導入できる |
| **今はやらない** | FILE 全除外（C5）／短時間クラスター自動除外（C3）／UI トグル即追加／式の即変更／DB 履歴削除 | 過剰除去で非可逆。根拠が固まる前に本番を変えると戻せない |

---

## 2. 背景と問題意識

### 2.1 観測された体感劣化

ClipBox のランキング画面（`/api/ranking`）で、ユーザーは次の不満を感じている。

- **「いつも同じ動画が上位に並ぶ」** — 上位の顔ぶれが固定化していて新鮮味がない。
- **「期間（今週/今月/全期間）を変えても順位がほとんど変わらない」** — 期間フィルタが効いている実感が薄い。

ランキングの主変数は `view_days = COUNT(DISTINCT DATE(viewed_at))`（視聴した「日」の数）である。もし
`viewed_at` の大半が短期間に一括投入された人工的なレコードであれば、(a) 一部の動画だけが不自然に高い
`view_days` を持ち続け、(b) その大半が特定の過去日に固まっているため期間を絞っても順位が動かない、という
両方の症状が説明できる。

### 2.2 汚染源 — `FILE_ACCESS_DETECTED` レガシー

ClipBox は過去に「ファイルへのアクセスを検知して視聴履歴に記録する」機能を持っていた（`viewing_method =
'FILE_ACCESS_DETECTED'`）。この機能は Phase 1 で廃止され、現在アプリが書き込む履歴は `APP_PLAYBACK`
（アプリ内再生）だけになっている。しかし**過去に書かれた `FILE_ACCESS_DETECTED` 行（5,443 行）は DB に残ったまま**で、
`view_days` の計算に今も算入されている。スキャンやファイル走査の副産物として**同一タイムスタンプに大量の行が
一括投入された痕跡**が含まれ、これが `view_days` を実態以上に押し上げていると疑われる。

### 2.3 これまでの調査と本分析の問い

Round 1 / Round 2 の先行調査（`docs/analysis/ranking_bulk_viewing_history_investigation.md`・main マージ済み）で、
「完全一致タイムスタンプ ≥5 件かつ FILE_ACCESS かつ AVP 導入前」の行が**唯一の高精度なバルク汚染フラグ**
（11 グループ / 63 行 / 61 動画・`APP_PLAYBACK` 混入ゼロ）であると分かっていた。

本分析の問いは次の 2 つである。

1. 先行調査の数値を**独立に再現**できるか。
2. 先行調査で未定量だった候補（APP 限定ランキング・重み下げ・genuine_view_days・availability バイアス）まで
   含めて 8 候補を、**「効きそう（体感改善）／壊しにくい（安全性）／根拠が強い（妥当性）」の 3 軸**で定量比較し、
   **次に実装する 1 つを選べる状態**にできるか。

---

## 3. 用語定義（本書内で自己完結）

| 用語 | 定義 |
|---|---|
| **viewing_history** | 視聴イベントのログテーブル。1 行 = 1 回の視聴記録（`video_id`, `viewed_at`, `viewing_method`）。 |
| **viewing_method** | 視聴記録の出所。後述 3 値。 |
| `APP_PLAYBACK` | 現行アプリでの再生（`play_video()` 単発、または AVP 一括）。**現在も書かれる唯一の方式**。 |
| `FILE_ACCESS_DETECTED` | 旧「ファイルアクセス検知」由来。**現在は書かれない（archived）**。本分析の汚染対象。 |
| `MANUAL_ENTRY` | 手動入力。本 DB には**0 行**（実質存在しない）。 |
| **view_count** | 動画ごとの視聴**行数** = `COUNT(*)`（同日複数回も別カウント）。 |
| **view_days** | 動画ごとの視聴**日数** = `COUNT(DISTINCT DATE(viewed_at))`。**順位の主変数**。 |
| **likes** | 動画ごとの「いいね」数（`likes` テーブルの行数）。本 DB では 67 動画 / 91 行のみと希少。 |
| **composite** | 本番ランキングの既定スコア式。§4 で詳述。`view_days`・`likes`・tier ボーナスの合成。 |
| **t1 / Tier1** | 「判定済み」フラグ。`current_favorite_level >= 0`（レベル付与済み）なら 1。composite に +50%。 |
| **t2 / Tier2** | 「選別済み」フラグ。`is_selection_completed = 1` なら 1。composite に +30%。 |
| **AVP** | Adjacent Video Player。最大 **4 本**を同時再生する機能。1 セッションで最大 4 行を**同一 `viewed_at`** で記録。 |
| **pre_avp 境界** | `2026-06-10 00:00:00`。commit `8bf84fb` で AVP の履歴記録（= `APP_PLAYBACK` 化）が始まった日時。これより前を pre-AVP、以後を post-AVP と呼ぶ。 |
| **essential_filename** | 全プレフィックスを除いた本質ファイル名（DB の UNIQUE 識別子）。**本書には出さない**（private）。 |
| **is_available** | その動画が今ランキングに出る対象か。外付け HDD 未接続なら 0。本番ランキングは原則 `is_available=1` のみ表示。 |
| **storage_location** | 物理保管先（`C_DRIVE` / `EXTERNAL_HDD`）。 |
| **scope（スコープ）** | 集計の母集団。本番に存在するのは「利用可能のみ（`is_available=1`）/ すべて」の 2 つ。 |
| **lens（分析専用レンズ）** | 本書だけで使う追加母集団（`c_drive_only` / `external_hdd_only` / `all_not_deleted`）。**本番 UI には存在しない**。観察のために切る断面。 |
| **Spearman 順位相関** | 2 つの順位列がどれだけ似ているかの指標（1.0=完全一致、0=無相関）。本書では「クリーニング前後で順位がどれだけ保たれたか」の安定性指標。値が高い=変化が小さい=安全、低い=変化が大きい=危険かつ効く。 |
| **Top-N 入替** | ベースライン Top-N のうち、候補適用後に Top-N から**外れた**動画の数。大きいほど顔ぶれが変わる。 |

---

## 4. 現行ランキングの仕組み

ランキングは `core/analysis_service.py::get_ranked_videos_for_tab(ranking_type, period_label, min_level,
availability_filter, top_n)` が生成し、`GET /api/ranking` で配信される。

### 4.1 4 つの種別（ranking_type）

| 種別 | スコア | 意味 |
|---|---|---|
| `view_count` | `COUNT(*)` | 視聴回数（行数） |
| `view_days` | `COUNT(DISTINCT DATE(viewed_at))` | 視聴日数 |
| `likes` | いいね数 | 純粋ないいねランキング |
| `composite`（既定） | 下記の合成式 | 視聴日数・いいね・判定/選別状態の総合 |

### 4.2 composite 式（本書の中心）

```
composite = int( (view_days · 1 + likes · 3) · (1 + 0.5·t1 + 0.3·t2) · 100 )
```

項ごとの意味:

- `view_days · 1`（係数 `_COMPOSITE_A = 1`）— 視聴日数の寄与。**ここに FILE_ACCESS 汚染が直接効く**。
- `likes · 3`（係数 `_COMPOSITE_B = 3`）— いいね 1 件は視聴日数 3 日分の価値。ただし likes は希少（67 動画のみ）。
- `(1 + 0.5·t1 + 0.3·t2)` — 判定済み（+50%）・選別済み（+30%）の**乗算ボーナス**。両方なら ×1.8。
- `· 100` — 整数化のためのスケール。

**タイブレーカー**（同点時の並び）: `score DESC → last_viewed_at DESC → id ASC`。
**フィルタ**: `score > 0` かつ `is_deleted = 0`（スコア 0 の動画はランキングに載らない）。

### 4.3 数式ワークスルー（匿名 1 本 = V001）

ベースライン Top1 の V001 を実データで分解すると（表3 参照）:

- アプリ再生日数 `app_view_days = 7`、旧ファイルアクセス日数 `file_access_view_days = 23`、`likes = 2`、`t1 = 1`、`t2 = 1`。
- 総 `view_days`（method を問わない distinct date）は、composite から逆算して **24 日**。
  `(view_days + likes·3) · 1.8 · 100 = 5400` ⟹ `(view_days + 6) · 180 = 5400` ⟹ `view_days = 24`。
- 検算: `int((24·1 + 2·3) · (1 + 0.5·1 + 0.3·1) · 100) = int(30 · 1.8 · 100) = 5400` ✓。

ここで重要なのは、**総 view_days 24 日のうち 23 日が「旧ファイルアクセスのあった日」**である点（app は 7 日、
同日に両方ある重複が 6 日 ⇒ 7 + 23 − 24 = 6）。つまり V001 の Top1 は、アプリでの実再生(7 日)ではなく
ファイルアクセス検知(23 日)が事実上決めている。これが「上位が実再生で決まっていない」という体感の正体を、
1 本で具体化した例である。

---

## 5. 前提と制約

### 5.1 コードと Git 履歴から確認した事実

- 現在 viewing_history に書かれるのは `APP_PLAYBACK` のみ。`play_video()`（単発 INSERT）と
  `record_avp_viewing()`（AVP 一括 INSERT）の 2 経路で、いずれも `viewing_method = 'APP_PLAYBACK'`。
- `FILE_ACCESS_DETECTED` / `MANUAL_ENTRY` は廃止済み（既存行は保持）。後者は 0 行。
- **AVP は最大 4 本同時再生**。`record_avp_viewing()` は同一 `viewed_at`（`datetime.now()` 1 回分）で**最大 4 行**を
  `executemany` で一括 INSERT する。ゆえに **完全一致タイムスタンプ 2〜4 件には正当な AVP 履歴が混ざり得る**。
  **完全一致 5 件以上は現行のどの経路でも生成不能**（単発は 1 行、AVP は最大 4 行）。
- `pre_avp 境界 = 2026-06-10 00:00:00`（commit `8bf84fb`）。これ以後の履歴は AVP 記録が始まっており、
  完全一致グループは AVP 由来（最大 4 件）として解釈する必要がある。
- 本番の availability スコープは「利用可能のみ / すべて」の 2 つだけ。本書の `c_drive_only` /
  `external_hdd_only` / `all_not_deleted` は**分析専用レンズ**であり、本番 UI には存在しない。

### 5.2 本タスクで禁止していること（厳守）

実 DB の物理削除 / `viewing_history` の DELETE・UPDATE / DB migration の追加 / ランキング式の本実装変更 /
API 仕様変更 / UI 変更 / private 情報（動画名・ファイル名・フルパス・出演者・ローカルメディアパス）の公開出力 /
DB コピー・CSV・JSON・Notebook 出力・個人データの Git 管理化。本書はこれらを一切行っていない。

---

## 6. データの素性（コピー DB スナップショット）

以降の全数値は、この 1 スナップショットから算出している。各表の母数を理解するための土台。

### 6.1 DB コピーの作成方針（安全措置）

- 実 DB (`data/videos.db`) には**接続しない**。コピー `docs/analysis/private/videos_private_20260619_224612.db` を作り、
  `sqlite3.connect("file:…?mode=ro", uri=True)` + `PRAGMA query_only=ON` で**読み取り専用**で開いた。
- `core.database.get_db_connection()` も使わない（実 DB を指すため完全隔離）。
- 読み出した列は id・状態列・`viewing_history(id / video_id / viewed_at / viewing_method)`・`storage_location`・
  `likes` に限定。動画名 / フルパス / 出演者 / メディアパスは**一切読まない・出さない**。
- 公開レポート（本書）は匿名 ID（`V001…`）と集計値のみ。匿名対応表は `docs/analysis/private/anon_id_map.csv`
  （gitignore・ローカル専用）。

### 6.2 全体の母数

| 項目 | 値 |
|---|---:|
| videos（`is_deleted = 0`） | 4,103 |
| viewing_history 総行数 | 6,725 |
| └ `APP_PLAYBACK` | 1,282 |
| └ `FILE_ACCESS_DETECTED` | 5,443（**全体の 80.9%**） |
| └ `MANUAL_ENTRY` | 0 |
| post-AVP 行（≥ 2026-06-10） | 131（**全て `APP_PLAYBACK`**） |
| pre-AVP の APP 行 | 1,151 |
| likes（動画数 / 行数） | 67 / 91 |
| viewed_at 範囲 | 2026-01-02 〜 2026-06-18 |

**読み取り**: 履歴の 5 行に 4 行が旧 FILE_ACCESS。post-AVP（AVP 導入後）の 131 行はすべて APP_PLAYBACK で、
FILE_ACCESS は 1 行も含まれない ⇒ FILE_ACCESS 汚染は**完全に過去側に閉じている**。

### 6.3 スコープ別の母数

| scope / lens | videos | scored（`composite > 0`） |
|---|---:|---:|
| available_only（`is_available = 1`・**本番**） | 221 | 208 |
| all_not_deleted（**分析レンズ**・本書の headline） | 4,103 | 1,085 |
| c_drive_only（**分析レンズ**） | 321 | 294 |
| external_hdd_only（**分析レンズ**） | 3,782 | 791 |

**読み取り**: ライブラリ 4,103 本のうち **3,782 本（92.2%）が外付け HDD**。そして外付け HDD は未接続だと
`is_available = 0` になるため、本番で実際にランキングに載るのは 221 本（うちスコア付き 208 本）に過ぎない。
**残り 95% は順位計算の土俵に上がっていない**。これは §11 / §14 の C8 議論の核心。

---

## 7. 仮説（H1〜H6）

分析前に立てた仮説と、それぞれを「どの指標で検証するか」を明示する（検証結果は §11）。

| ID | 仮説（主張） | 根拠（なぜそう考えるか） | 検証指標 |
|---|---|---|---|
| **H1** | `view_days` は FILE_ACCESS に偏り、上位は「実再生」でなく「旧ファイルアクセス日数」で決まっている | 履歴の 80.9% が FILE_ACCESS。view_days は method を区別せず数える | 表3 の `app_view_days` vs `file_access_view_days` の大小 |
| **H2** | 完全一致 ≥5 の FILE 行は現行経路で生成不能なバルクで、高信頼に隔離できる | 単発=1 行・AVP=最大 4 行。5 件以上は説明不能 | C1 の app_rows / 完全一致グループの size 分布 |
| **H3** | 正当 AVP 履歴（完全一致 2〜4）と区別するには `FILE ∧ pre-AVP` ガードが必須 | post-AVP の APP も同一 viewed_at で 2〜4 行を作る | post-AVP の APP 完全一致 size、C1 の app_rows=0 |
| **H4** | likes ランキングは履歴クリーニングの影響を受けない（不変） | likes は viewing_history と独立 | 全候補の likes ランキング Spearman |
| **H5** | composite は `likes·3` と tier ボーナスで生 view_days より頑健 | 乗算ボーナスと likes 項が view_days の変動を緩衝 | 同一候補での composite vs view_days の Spearman 比較 |
| **H6** | 体感劣化のもう一つの主因は `is_available` による外付け HDD 不可視化 | HDD が 92%・未接続で順位に出ない | available_only と c_drive_only のランキング一致度 |

---

## 8. 分析方法（Methodology）

### 8.1 全体方針

実 DB に触れずに**本番ランキングを再現**するため、本番ロジック（`get_ranked_videos_for_tab`）を呼ばず
**SQL とスコア式をコピー DB 上で複製**した。スクリプトは `docs/analysis/notebooks/ranking_fairness_multifactor.py`
（依存は pandas / numpy のみ。scipy 非依存・Spearman は自前実装）。集計は CSV / `summary.json` に出力（すべて gitignore）。

### 8.2 動画ごとの集計（per-video）

各 `video_id` について以下を算出（期間は UI 既定の全期間）:

- `view_count = COUNT(*)`、`view_days = COUNT(DISTINCT DATE(viewed_at))`
- 内訳: `app_view_days`（APP 行だけの distinct date）、`file_view_days`（FILE 行だけ）、`c1_view_days`（C1 該当行だけ）
- `likes`、`t1 = (current_favorite_level >= 0)`、`t2 = is_selection_completed`
- `composite = int((view_days·1 + likes·3)·(1 + 0.5·t1 + 0.3·t2)·100)`、`last_viewed_at = MAX(viewed_at)`

### 8.3 候補フラグの算出ロジック

`pre_avp = viewed_at < '2026-06-10 00:00:00'`。`exact_size = ` 同一 `viewed_at` を持つ行数。

- **C1**: `exact_size >= 5 ∧ FILE_ACCESS ∧ pre_avp`
- **C2**: `exact_size ∈ [2,4] ∧ FILE_ACCESS ∧ pre_avp`
- **C3（短時間クラスター）**: FILE ∧ pre_avp の行を時刻順に並べ、**隣接ギャップ ≤ 60 秒**で同一クラスターに束ね、
  クラスターサイズ `≥5`（C3_5）/ `≥10`（C3_10）の行をフラグ。実装は `gap = dt.diff()`、`(gap > 60).cumsum()` で
  クラスター ID を振り、各 ID のサイズで閾値判定。
- **C4 / C5**: APP_PLAYBACK のみで再集計（= FILE 全除外。本 DB は MANUAL=0 なので両者同値）。
- **C6（重み下げ・除外しない）**: 日重み = **その日の行の method 最大重み**。`APP = 1.0` / `C1 = 0` /
  `C3_10 = 0.25` / その他 FILE = `file_base`（0.25 または 0.50）。`weighted_view_days = Σ 日重み` で composite 再計算。
- **C7（genuine_view_days）**: bulk 行を除いた distinct-date。`C7a` = C1 のみ除外、`C7b` = C1 + C3_10 除外。
- **C8（availability バイアス）**: 式は現行のまま、4 スコープで Top50 構成差を比較（除外でなくスコープ設計の問題）。

### 8.4 指標の定義

- **Top-N 入替**: ベースライン Top-N の動画 id 集合のうち、候補適用後に Top-N に**残らなかった**数。
- **Spearman**: ベースライン Top-N の各動画について（ベースライン順位）と（候補での順位）を並べ、両列を順位化して
  Pearson 相関を取る自前実装。候補で圏外に落ちた動画は `len(cand)+1` の最下位として扱う。
- これを **scope（4）× ranking_type（4）** の各組で算出 → 表2。headline は `all_not_deleted × composite`。

### 8.5 匿名化

ベースライン composite（all_not_deleted 順）に沿って実 `video_id` を連番 `V001…` に置換。対応表は
`docs/analysis/private/anon_id_map.csv` にローカル保存。公開する本書は匿名 ID と整数集計のみ。

---

## 9. 候補定義（C1〜C8）

| ID | 名称 | 種別 | 定義 / 狙い | 主なリスク |
|---|---|---|---|---|
| **C1** | `EXACT_TIMESTAMP_GE5_LEGACY_FILE_ACCESS` | 行除外 | 完全一致 ≥5・FILE・pre-AVP。現行経路で作れない明白なバルクの隔離 | ほぼ無し（高信頼） |
| **C2** | `EXACT_2_4_FILE_ACCESS_PRE_AVP` | 監査 | 完全一致 2〜4・FILE・pre-AVP。広め・弱め | AVP 正当近接と区別が弱い（ガードで AVP は回避） |
| **C3** | `SHORT_CLUSTER_60S_GE5 / GE10` | 監査 | 60 秒以内連続の塊。スキャン副産物の疑い | 正当な連続視聴を大量に巻き込む |
| **C4** | `APP_PLAYBACK_ONLY` | 比較ビュー | APP 行だけで再ランキング | 過去の正当 FILE 視聴を全消去 |
| **C5** | `EXCLUDE_FILE_ACCESS`（全除外） | 比較ベースライン | FILE を全除外。MANUAL=0 のため C4 と同値 | C4 と同じ（非可逆） |
| **C6** | `WEIGHT_DOWN_FILE`（0.25 / 0.50） | 重み下げ | FILE 日を減点（除外しない）。順位の連続性を保ちつつ偏りを緩和 | 係数が恣意的 |
| **C7** | `GENUINE_VIEW_DAYS`（a=C1 / b=C1+C3） | スコア変数 | 「信頼できる視聴日数」を新変数化 | b は C3 と同じ過剰除去 |
| **C8** | `AVAILABILITY_SCOPE` | スコープ設計 | 接続有無による不可視化の是正（別軸） | 設計判断が必要（汚染とは独立） |

---

## 10. 結果（Results）

> 表中の数値はすべて §6 のスナップショット由来。`safety` / `evidence` / `ux` は 5 段階（5 が最良/最強/最大）。

### 10.1 表1: 候補ルール比較

headline スコープ = `all_not_deleted`・種別 = `composite`。

| candidate_id | candidate_name | target_rows | uniq_videos | app_rows | file_rows | pre_avp_rows | top50_chg | top100_chg | spearman_top100 | safety | evidence | ux_impact | recommendation |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|:--:|:--:|:--:|---|
| C1 | EXACT_TIMESTAMP_GE5_LEGACY_FILE_ACCESS | 63 | 61 | 0 | 63 | 63 | 0 | 0 | 0.996 | 5 | 5 | 1 | **採用**（flag/reason のみ） |
| C2 | EXACT_2_4_FILE_ACCESS_PRE_AVP | 340 | 220 | 0 | 340 | 340 | — | — | — | 3 | 3 | 1 | 監査のみ |
| C3_5 | SHORT_CLUSTER_60S_GE5 | 4,662 | 1,001 | 0 | 4,662 | 4,662 | — | — | — | 2 | 2 | — | 監査のみ |
| C3_10 | SHORT_CLUSTER_60S_GE10 | 4,546 | 1,001 | 0 | 4,546 | 4,546 | — | — | — | 2 | 2 | — | 監査のみ |
| C4/C5 | APP_PLAYBACK_ONLY / EXCLUDE_FILE_ACCESS | 5,443 | 1,020 | 0 | 5,443 | 5,443 | 25 | 47 | 0.820 | 1 | 3 | 4 | 比較ビューのみ |
| C6_025 | WEIGHT_DOWN_FILE_0.25（除外なし） | 5,443※ | — | 0 | 5,443 | 5,443 | 13 | 23 | 0.858 | 4 | 3 | 3 | **次分析（本命）** |
| C6_050 | WEIGHT_DOWN_FILE_0.50（除外なし） | 5,443※ | — | 0 | 5,443 | 5,443 | 14 | 22 | 0.862 | 4 | 3 | 3 | 次分析 |
| C7a | GENUINE_VIEW_DAYS（C1 のみ除外） | 63 | 61 | 0 | 63 | 63 | 0 | 0 | 0.996 | 5 | 5 | 1 | = C1 と同値 |
| C7b | GENUINE_VIEW_DAYS（C1+C3 除外） | 4,546 | 1,001 | 0 | 4,546 | 4,546 | 21 | 50 | 0.843 | 2 | 3 | 4 | 次分析（要注意） |
| C8 | AVAILABILITY_SCOPE | 3,782※※ | 3,782 | — | — | — | (別軸) | — | — | 4 | 4 | 5 | **次分析（別トラック）** |

※ C6 は**除外でなく重み下げ**（5,443 行を減点・行は残る）。
※※ C8 は除外でなく**スコープ設計**（外付け HDD 3,782 本が `is_available = 0` でランキング非表示）。

**この表が示すこと**: `app_rows` 列が全候補で **0** であることが第一の発見。どの候補も `APP_PLAYBACK`（実再生）を
1 件も巻き込まない。安全性（safety）と体感（ux_impact）が**逆相関**しているのも明白で、安全な C1/C7a は ux=1、
体感が動く C4/C7b は safety=1〜2。両者の間に C6（safety=4 / ux=3）が位置する。

### 10.2 表2: ランキング影響比較（scope × ranking_type）

各セル = `Top50入替 / Top100入替 / Top100 Spearman`。

#### composite（本番既定種別）

| candidate | available_only | all_not_deleted | c_drive_only | external_hdd_only |
|---|---|---|---|---|
| C1 | 0 / 0 / 0.998 | 0 / 0 / 0.996 | 0 / 0 / 0.998 | 0 / 1 / 0.997 |
| C6_025 | 12 / 16 / 0.753 | 13 / 23 / 0.858 | 12 / 16 / 0.753 | 7 / 17 / 0.825 |
| C6_050 | 11 / 13 / 0.760 | 14 / 22 / 0.862 | 12 / 15 / 0.760 | 9 / 25 / 0.839 |
| C4/C5 | 22 / 40 / 0.601 | 25 / 47 / 0.820 | 22 / 41 / 0.601 | 24 / 60 / 0.607 |
| C7b | 20 / 27 / 0.618 | 21 / 50 / 0.843 | 20 / 29 / 0.618 | 27 / 48 / 0.618 |

#### view_days（順位の主変数・生）

| candidate | available_only | all_not_deleted | c_drive_only | external_hdd_only |
|---|---|---|---|---|
| C1 | 1 / 0 / 1.000 | 1 / 1 / 0.999 | 1 / 0 / 1.000 | 0 / 2 / 0.994 |
| C6_025 | 12 / 17 / 0.825 | 13 / 25 / 0.700 | 13 / 20 / 0.825 | 12 / 24 / 0.651 |
| C4/C5 | 30 / 44 / 0.604 | 31 / 63 / 0.562 | 31 / 51 / 0.604 | 27 / 59 / **0.229** |
| C7b | 32 / 42 / 0.653 | 27 / 63 / 0.630 | 32 / 48 / 0.653 | 33 / 50 / **0.298** |

#### likes（純粋いいね）/ view_count（参考）

- **likes は全候補・全スコープで `0 / 0 / 1.000`**（完全不変）。履歴クリーニングはいいねランキングに一切影響しない。
- view_count は概ね view_days と同傾向（C1 はほぼ不変、C4/C7b は大幅入替、C6 は raw count なので不変＝0/0/1.0）。

**この表が示すこと**: (1) C1 はどのスコープ・種別でも Spearman ≈ 1.0（順位がほぼ保たれる）＝安全だが効かない。
(2) C4/C5・C7b は composite でも Spearman 0.6 前後、生 view_days では external_hdd で **0.23〜0.30** まで崩壊
＝効くが壊しすぎ。(3) C6 はその中間（composite 0.75〜0.86）。(4) **`available_only` と `c_drive_only` の数値が
ほぼ一致**しており、可視ランキングが実質 C ドライブランキングであることを裏付ける（§11 H6）。

### 10.3 表3: スコア寄与分解（baseline composite Top50・all_not_deleted・匿名 ID）

`proposed_rank_change` = **推奨候補 C1 適用後**の順位変化（+ は下落、− は上昇、0 は不変）。

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
| V012 | 12 | 3600 | 2 | 16 | 1 | 1 | 1 | 1 | C_DRIVE | 1 | −1 |
| V013 | 13 | 3600 | 5 | 14 | 1 | 2 | 1 | 1 | EXTERNAL_HDD | 0 | −1 |
| V014 | 14 | 3600 | 4 | 10 | 0 | 3 | 1 | 1 | EXTERNAL_HDD | 0 | −1 |
| V015 | 15 | 3420 | 2 | 15 | 0 | 1 | 1 | 1 | EXTERNAL_HDD | 0 | 0 |
| V016 | 16 | 3420 | 2 | 12 | 0 | 2 | 1 | 1 | EXTERNAL_HDD | 0 | 0 |
| V017 | 17 | 3420 | 7 | 18 | 0 | 0 | 1 | 1 | EXTERNAL_HDD | 0 | 0 |
| V018 | 18 | 3300 | 3 | 16 | 0 | 2 | 1 | 0 | C_DRIVE | 1 | 0 |
| V019 | 19 | 3300 | 4 | 16 | 2 | 2 | 1 | 0 | C_DRIVE | 1 | 0 |
| V020 | 20 | 3150 | 4 | 17 | 1 | 1 | 1 | 0 | C_DRIVE | 1 | 0 |
| V021 | 21 | 3060 | 4 | 17 | 1 | 0 | 1 | 1 | EXTERNAL_HDD | 0 | **+8** |
| V022 | 22 | 3060 | 2 | 13 | 0 | 1 | 1 | 1 | C_DRIVE | 1 | −1 |
| V023 | 23 | 3060 | 1 | 14 | 0 | 1 | 1 | 1 | C_DRIVE | 1 | −1 |
| V024 | 24 | 3060 | 1 | 14 | 0 | 1 | 1 | 1 | C_DRIVE | 1 | −1 |
| V025 | 25 | 3060 | 1 | 14 | 0 | 1 | 1 | 1 | EXTERNAL_HDD | 0 | −1 |
| V026 | 26 | 3060 | 1 | 17 | 0 | 0 | 1 | 1 | C_DRIVE | 1 | −1 |
| V027 | 27 | 3060 | 1 | 14 | 0 | 1 | 1 | 1 | EXTERNAL_HDD | 0 | −1 |
| V028 | 28 | 3000 | 3 | 9 | 0 | 3 | 1 | 0 | C_DRIVE | 1 | −1 |
| V029 | 29 | 2880 | 2 | 13 | 0 | 1 | 1 | 1 | EXTERNAL_HDD | 0 | −1 |
| V030 | 30 | 2880 | 1 | 16 | 0 | 0 | 1 | 1 | C_DRIVE | 1 | 0 |
| V031〜V050 | 31–50 | 2880–2700 | 0–4 | 8–17 | 0 | 0–2 | 1 | 0/1 | mix | mix | 0 |

（V031 以降の全行は `susp_vd = 0`・`C1後Δ = 0`。完全版は `docs/analysis/data/table3_top50_decomp.csv`。）

**この表が示すこと**:
- **`file_vd`（旧ファイルアクセス由来の日数）が `app_vd`（実再生由来）を全行で大きく上回る**。例: V050 は
  app=0 / file=15、V026 は app=1 / file=17。Top50 は事実上「ファイルアクセス検知日数」で並んでいる（→ H1 を支持）。
- だが **C1 の `susp_vd`（完全一致 ≥5 該当日数）は Top50 でほぼ 0**（50 行中 6 行のみ 1〜2 日）。だから
  **C1 を適用しても Top50 はほとんど動かない**（±1 が大半、最大でも V021 の +8）。C1 は「明白な旧バルクの隔離」で
  あって「体感の作り直し」ではない（→ H2 は支持、ただし体感改善には不十分）。
- `t1 = 1`（判定済み）はほぼ全件、`available = 0`（外付け HDD）も Top50 の約半数を占める。本番の
  `available_only` ではこれらが消える（→ H6）。

### 10.4 表4: 採用しない候補と理由

| 候補 | 採用しない理由 | 巻き込む危険 | 監査候補として残すか | 将来再検討の条件 |
|---|---|---|---|---|
| C2（exact 2〜4・FILE・pre-AVP） | 340 行 / 220 動画と広く、2〜4 件一致は 5 件以上より根拠が弱い | （ガードにより AVP は回避）正当な近接ファイルアクセスを誤判定し得る | **残す**（audit flag） | C1 運用後に監査表で人手確認し、誤検出率が低いと確認できた場合のみ |
| C3（60 秒クラスター ≥5/≥10） | 4,546〜4,662 行 = **67.6%** と過大。自動除外で生 view_days の Spearman が 0.23〜0.30 まで崩壊 | 正当な連続視聴・まとめ見を大量に巻き込む | **残す**（audit flag のみ） | クラスター内 method 構成や前後行から「スキャン副産物」と人手で確証できる部分集合に限定できた場合 |
| C4/C5（APP のみ / FILE 全除外） | 過去の正当な FILE_ACCESS 視聴も全消去。実質非可逆。Top50 を 22〜25 入替 | FILE 期（2026-01〜06-09）の本物の視聴履歴を全否定 | 比較ビューとしてのみ | 「本物の FILE 視聴」と「スキャン副産物」を分離する別シグナルが確立した場合 |
| C7b（genuine 60 秒版） | 実質 C3 自動除外。生 view_days の Spearman 崩壊 | C3 と同じ | 分析比較のみ | C7 を C1 ティアに限定するなら C7a として採用可 |
| ランキング式の即変更 / UI トグル即追加 | 根拠が固まる前に本番挙動を変えると戻せない | 体感が逆に悪化するリスク | — | C1 隔離 → C6/C8 分析の数値が揃ってから |

---

## 11. 考察（仮説検証）

各仮説を §10 の数値で判定する。

- **H1（view_days は FILE_ACCESS 偏重）: 支持。** 表3 で Top50 全行が `file_vd ≫ app_vd`。V001 のワークスルー
  （§4.3）でも総 view_days 24 日中 23 日が file 由来。**上位は実再生でなく旧ファイルアクセスで決まっている**。
  これが「いつも同じ動画」「期間で動かない」体感の中心原因。

- **H2（exact ≥5 は安全に隔離可能）: 支持。** C1 は 63 行すべて FILE ∧ pre-AVP、app_rows = 0。完全一致 ≥5 の
  グループ size 分布は {5:7, 6:1, 7:2, 8:1}（11 グループ）で、AVP 上限の 4 を必ず超える ⇒ 現行経路では生成不能。
  **ただし C1 適用の Top50 入替は 0**（susp_vd が上位にほぼ無い）ため、安全だが体感は動かない。

- **H3（FILE ∧ pre-AVP ガードが必須）: 支持。** post-AVP（≥2026-06-10）の 131 行はすべて APP で、その完全一致
  グループは最大 size = 4（AVP 上限と一致）。もし生の `exact ≥ 2` だけで判定すると、この正当な AVP 24 行を
  誤検出してしまう。`FILE ∧ pre-AVP` ガードを掛けることで、C1 の app_rows = 0 を達成できている。

- **H4（likes 不変）: 支持。** 表2 で likes ランキングは全候補・全スコープで Spearman = 1.000。いいねは
  viewing_history と独立なので、履歴クリーニングの影響を受けない。**「いいね」種別は今回の問題の埒外**。

- **H5（composite は view_days より頑健）: 支持。** 同一候補で比較すると、C4/C5 の external_hdd は composite 0.607 に対し
  生 view_days 0.229、C7b も composite 0.618 に対し view_days 0.298。`likes·3` と tier ボーナスが view_days の変動を
  緩衝している。**体感改善を狙うなら、生 view_days を直接いじるより composite ベースで段階導入する方が安全**。

- **H6（availability の不可視化が主因の一つ）: 支持。** 表2 で `available_only` と `c_drive_only` の数値が
  ほぼ一致（例 C6_025 composite: available 12/16/0.753 vs c_drive 12/16/0.753）。母数も available_only 221 ≈
  C ドライブ寄り。ライブラリの 92% が外付け HDD で未接続時に消えるため、**可視ランキングは事実上 C ドライブ内の
  ランキング**になっている。これは FILE_ACCESS 汚染とは独立した、別軸の体感劣化要因。

### 総合的な解釈

体感劣化は単一原因ではなく、**(a) FILE_ACCESS 偏重の view_days（H1）** と **(b) is_available による外付け HDD
不可視化（H6）** の複合である。C1（H2）は (a) の中でも「明白なバルク」だけを切り出した安全部分集合だが、
それは view_days 全体のごく一部（Top50 にほぼ寄与しない）でしかない。したがって:

- **安全に確定できるのは C1 だけ**だが、それだけでは体感は変わらない。
- **体感を動かすには (a) は C6 重み下げで段階的に、(b) は C8 スコープ設計で**取り組む必要がある。
- **効果と安全性はトレードオフ**で、安全側（C1）と効果側（C4/C7b）の間に C6 が「効きつつ可逆」な現実解として
  位置する。

---

## 12. 安全性評価

| 観点 | 結論 |
|---|---|
| APP_PLAYBACK を巻き込むか | **C1/C2/C3/C7 は巻き込まない**（対象の app_rows = 0）。完全一致 ≥5 グループ内の APP 行は**全 DB で 0 件**。 |
| AVP 正当 2〜4 件を巻き込むか | **C1 は巻き込まない**。post-AVP の APP 完全一致グループは**全て size = 4**（6 セッション・24 行）で AVP 上限と一致。完全一致 ≥5 に APP は 1 件も無い。生 `exact ≥ 2` だとこの 24 行を誤検出するが、`FILE ∧ pre-AVP` ガードで回避。 |
| 既存 DB を壊すか | 全候補とも**読み取り専用コピーのみ**で検証。実 DB・履歴は無変更。 |
| 現行 API/UI 仕様を壊すか | 本書は分析のみ。推奨初手も**flag/reason 付与のみでランキング除外しない**ため API/UI 不変。 |
| ランキングが変わりすぎないか | C1 = ほぼ不変で安全。C4/C5/C7b = 変わりすぎ（Spearman 0.6 前後・生 view_days で 0.23）。C6 = 中間（0.75〜0.86）。 |
| 後から戻せるか | C1/C6 は flag・重みなので可逆。C4/C5 の「FILE 全除外」は**過去の正当視聴も消すため実質非可逆**。 |
| 初回を flag/reason に分離できるか | **できる**（C1）。派生テーブル/ビューで `bulk_reason` を付与し、ランキング除外は後続 PR に分離。 |

---

## 13. 根拠の強さ評価

| 観点 | 結論 |
|---|---|
| Git 履歴・仕様・コード挙動と整合 | ◎ `record_avp_viewing()`（≤4 行・同一 viewed_at・APP_PLAYBACK）と `play_video()`（APP）から、完全一致 ≥5 は現行経路で生成不能。 |
| FILE_ACCESS の archived 扱いと整合 | ◎ FILE_ACCESS は現在書かれず、C1/C2/C3 対象は全て FILE_ACCESS かつ pre-AVP。 |
| 2026-06-10 境界と整合 | ◎ post-AVP 行（131）は**全て APP**。C1/C2/C3 対象は全て pre-AVP。 |
| 同一 timestamp 件数と AVP 上限の整合 | ◎ APP 完全一致は最大 size = 4（AVP 上限）。FILE 完全一致は 5〜8 まで到達（旧一括記録の痕跡）。 |
| APP 混入の分離可能性 | ◎ C1（exact ≥5）は APP と**完全分離**。C2 も FILE ∧ pre-AVP ガードで AVP と分離。 |
| 統計的に過剰検出でないか | C1 は 63 行（0.9%）に限定で過剰検出ではない。C3（60 秒 ≥10）は 4,546 行 = **67.6%** と過剰、自動除外不可。 |

**根拠の強さ順位**: C1 = C7a（最強） > C8（is_available 仕様は明確） > C4/C5（APP = 現行有効方式は妥当だが
FILE 全否定が弱点） > C2 ≈ C3 ≈ C6（閾値・重みが恣意的）。

---

## 14. 体感改善の期待評価

| 候補 | 体感改善の期待 | 根拠 |
|---|---|---|
| C1 / C7a | **ほぼ無し**（土台） | Top50 入替 0・Spearman 0.996。明らかな旧バルクを隔離するだけ。 |
| C6（重み下げ） | **中**（本命の起点） | Top50 7〜14 入替・Spearman 0.75〜0.86。FILE 偏重を緩めつつ順位の連続性を保つ。可逆・説明容易。 |
| C4/C5（APP のみ） | 大だが危険 | Top50 20〜25 入替。だが「過去の正当な FILE_ACCESS 視聴」も全消去。比較ビュー向き。 |
| C7b（genuine 60 秒版） | 大だが危険 | Top50 21〜27 入替。実質 C3 自動除外で生 view_days の Spearman が 0.3 まで崩れる。 |
| C8（availability） | **最大** | 外付け HDD 3,782 本（92%）が不可視。接続有無という物理的偶然が上位を支配。別軸で最大ポテンシャル。 |

「いつも同じ動画」「期間を変えても順位が変わらない」体感の主因は、**(a) FILE_ACCESS 偏重の view_days** と
**(b) is_available による外付け HDD 不可視化** の複合。C1 単体では (a) のごく一部しか動かないため、
**体感改善の本命は C6（重み下げ）と C8（availability 設計）の追加分析**にある。

---

## 15. 推奨する次の一手

### 最有力（最初の小 PR）

- **`EXACT_TIMESTAMP_GE5_LEGACY_FILE_ACCESS`（C1）の flag/reason 化のみ**。**ランキング除外はまだしない。**
- 派生テーブル/ビュー、または集計時フラグで `bulk_reason = 'EXACT_TIMESTAMP_GE5_LEGACY_FILE_ACCESS'` を付与。
- **APP/AVP 保護テストを追加**（完全一致 ≥5 に APP 行が無いこと／AVP 完全一致は size ≤ 4 であることを回帰で固定）。
- 根拠最強・安全最大。体感インパクトは限定的だが、後続のクリーニング/重み下げの**安全な土台**になる。
- **なぜ初手にこれを選ぶか**: 唯一「app_rows = 0・Spearman 0.996」で副作用ゼロを証明できる候補だから。先に
  危険な体感改善（C4/C6/C7b）から入ると、何が原因で順位が動いたか切り分けられなくなる。土台を固めてから効果を足す。

### 次点の分析タスク（体感改善の本命はこちら）

1. **C6 重み下げの感度分析**（FILE day = 0.25/0.5、C1 day = 0、C3 day = 0.25）。除外より安全で体感が動く中間案。
   composite ベースで Top50 7〜14 入替・Spearman 0.75〜0.86。本書の数値を起点に係数を詰める。
2. **C8 availability 設計**（「接続中のみ / 全動画 / 外付け HDD 含む参考ランキング」の分離、`last_known_score` 保存）。
   別軸で最大の体感ポテンシャル。汚染対策と独立に進められる。
3. **C4（APP_PLAYBACK のみランキング）と現行の比較ビュー**を分析内に追加（本実装ではなく比較用）。
4. **C7（genuine_view_days）の定義を C1 ティア化**で再評価。60 秒クラスター版（C7b）は危険なので採らない。

### まだやらないこと

- `FILE_ACCESS_DETECTED` の全除外（C5）／短時間クラスター（C3）の自動除外
- UI トグルの即追加
- ランキング式の即変更
- DB 履歴の削除・UPDATE

---

## 16. 採用しない候補と理由

§10.4 の表4 を参照。要点は次のとおり:

- **C2 / C3 は「監査フラグ」として残すが自動除外はしない** — C3 は履歴の 67.6% を巻き込み、正当な連続視聴を
  大量に消すため。人手で「スキャン副産物」と確証できる部分集合に絞れた場合のみ将来再検討。
- **C4 / C5（FILE 全除外）は比較ビュー専用** — 過去（2026-01〜06-09）の本物の視聴も全否定する非可逆操作。
  「本物の FILE 視聴」と「スキャン副産物」を分離する別シグナルが確立するまで本実装しない。
- **式の即変更・UI トグル即追加はしない** — 根拠（C6/C8 の数値）が揃う前に本番挙動を変えると戻せず、
  体感が逆に悪化するリスクがある。

---

## 17. 今回は実装しないこと（明示）

- ランキング式・API・UI・DB スキーマ・migration の変更
- viewing_history の DELETE / UPDATE、実 DB の物理削除
- ランキングからの除外（C1 を含め、初手は flag/reason のみ）

本書は **分析と提案のみ**。コード・DB・履歴は一切変更していない。

---

## 18. 再現手順・付記（ローカル生成物・git 管理外）

### 再現方法

```
# 読み取り専用 DB コピーを docs/analysis/private/ に置いた上で
python docs/analysis/notebooks/ranking_fairness_multifactor.py
# → docs/analysis/data/{table1,table2,table3}.csv + summary.json を再生成
```

依存は pandas / numpy のみ（scipy 不要・Spearman 自前実装）。本番式は `core/analysis_service.py` の
`_COMPOSITE_A=1 / _COMPOSITE_B=3 / _COMPOSITE_BONUS_T1=0.5 / _COMPOSITE_BONUS_T2=0.3` と一致させてある。

### ローカル生成物（すべて gitignore・公開しない）

- 分析スクリプト: `docs/analysis/notebooks/ranking_fairness_multifactor.py`
- 集計 CSV: `docs/analysis/data/{table1_candidate_compare, table2_ranking_impact, table3_top50_decomp}.csv`、`summary.json`
- 読み取り専用 DB コピー: `docs/analysis/private/videos_private_20260619_224612.db`
- 匿名対応表: `docs/analysis/private/anon_id_map.csv`

いずれも視聴行動メタデータ（timestamp・件数・video_id）や動画実名を含むため `.gitignore` 対象。
本リポジトリ（public）には**本 Markdown のみ**を収録する。
