# 統合 Variant K — 段階2「統合シェル・共通部品」実装メモ

> 段階2は本体実装ではなく **サンプルDB接続前の UI LAB モック**。実 API / DB / migration / 設定ファイル / localStorage・sessionStorage 本体仕様 / 実データには触れていない。各画面の作り込みは段階3以降。

## 1. 実装した内容

統合 Variant K の土台を **案B（マルチルート＋`layout.tsx` 統合シェル）** で実装した。

- 統合シェル（左サイドバー常駐＋メイン＋「UI LAB モック・本体ではない」バナー）。
- 遷移するモックサイドバー（8画面・`usePathname` でアクティブ強調）。
- Runtime control をサイドバー下部にモック表示。
- ランディング＋各画面プレースホルダー（段階3以降の設計メモ表示）。
- 共通デザイン部品の骨格・合成データ。
- `/lab` ハブから `/lab/variant-k` への入口を1件追加。

各画面の本格 UI（Tier1 詳細・Tier2 トグル・あとで見る3セクション・AVP・ランキング・検索・設定 scan-first）は作り込んでいない。

## 2. 作成したルート

| URL | 役割 | 作り込み段階 |
|---|---|---|
| `/lab/variant-k` | ランディング（各画面導線・位置づけ表示） | 段階2 |
| `/lab/variant-k/tier1` | プレースホルダー | 段階3 |
| `/lab/variant-k/tier2` | プレースホルダー | 段階4 |
| `/lab/variant-k/watch-later` | プレースホルダー | 段階5 |
| `/lab/variant-k/avp` | プレースホルダー | 段階5 |
| `/lab/variant-k/ranking` | プレースホルダー | 段階6 |
| `/lab/variant-k/search` | プレースホルダー | 段階6 |
| `/lab/variant-k/settings` | プレースホルダー | 段階6 |
| `/lab/variant-k/analysis` | 仮ページ（採用判断対象外） | 対象外 |

`layout.tsx` は **server component** のまま `VariantKShell`（client）を包むだけにし、`metadata` 追加余地を残した。

## 3. 作成した共通部品（`_components/`）

- `theme.ts` — `VARIANT_K_THEME`（寒色モダンの CSS 変数・Variant J 流用）＋状態色トークン（`BADGE_CLASS`/`BADGE_LABEL`/`PLAYING_HIGHLIGHT_CLASS`）。
- `navItems.ts` — icon 付きナビ定義（8画面・Runtime control は含めない）。icon import を `_data` に持ち込まないため `_components` 側に配置。
- `VariantKShell.tsx`（client）— シェル本体。テーマ CSS 変数を root div に適用。
- `VariantKSidebar.tsx`（client）— 遷移ナビ＋ブランドマーク（サブタイトルなし）＋下部 Runtime control。
- `VariantKRuntimeControl.tsx`（client）— FastAPI/Next.js 個別表示＋「アプリを停止」（disabled モック）。
- `VariantKBadge.tsx` — 状態バッジ（kind 出し分け）。
- `VariantKVideoCard.tsx` — カード土台（サムネなし・2行タイトル・メタ=ストレージ/視聴日数/作成日）。
- `VariantKActionTable.tsx` — 汎用操作付きテーブル土台（列定義＋行・利用不可は行薄表示・再生中ハイライト）。
- `VariantKEmptyState.tsx` / `VariantKTooltipLabel.tsx` / `VariantKSectionHeader.tsx` / `VariantKPlaceholder.tsx`。

部品は骨格に留め、画面別の props は段階3以降で増やす前提。

## 4. 作成した合成データ（`_data/variantKMock.ts`）

`VariantKVideo` 型（snake_case・ダミー名8件）。フィールド: `id` / `title` / `storage` / `file_created_at` / `tier1_status` / `tier2_status` / `view_days` / `liked` / `like_count` / `watch_later` / `available` / `score` / `rank` / `last_played_at` / `judged_at` / `selected_at`。加えて `VARIANT_K_RUNTIME_MOCK`（FastAPI/Next.js）とフォーマッタ。実 API/DB/実データは読まない。

## 5. Runtime control モックの扱い

- サイドバー下部に配置（専用ページは作らない）。
- FastAPI / Next.js を個別表示（状態ランプ／状態テキスト／ポート／最終確認時刻）。**Streamlit は表示しない。**
- 「アプリを停止」は **`disabled` の純モック**。クリックで「停止済み」へ変える fake 挙動は持たせていない（本体に接続しない）。「モック」チップを明示。
- 既定コンパクト表示。
- 本段階2で作成。計画書の「段階6で Runtime control サイドバー下部を実装」は、段階6では **段階2版の確認・必要なら微修正** に読み替える（二重実装しない）。

## 6. 暫定バッジ色と理由（最終決定ではない）

| 種別 | 暫定色 | 理由 |
|---|---|---|
| 該当Tier=Tier1 | 青系（blue） | GLOSSARY が色を統合 Variant K で決めると明示。寒色テーマの基調色に最も近く「一次判定」を落ち着いて示せる。 |
| 該当Tier=Tier2 | ティール/シアン系（teal） | Tier1 の青と色相を分けつつ寒色内に収め、二重符号化（色＋ラベル）で識別。 |
| あとで見る | 中立トーンのアウトライン | DB 状態だが操作の主役でないため、該当Tierより視覚重みを弱く。 |
| 利用不可 | 低彩度（zinc） | 「操作不可」を即伝えるため彩度を落として沈める。テーブルでは行薄表示と併用。 |
| AVP候補 | indigo（初期OFF運用） | 既定では出さない（初期OFF）。部品としては用意。 |
| 再生中ハイライト | amber 系（`ring-amber-400`） | バッジでなくハイライトで「今/直近再生中」を示す共通ルール。寒色の中で暖色は注意を引き状態の一時性を表現。 |

色はユーザー確認で覆る可能性がある暫定値。

## 7. 既存Variantへの影響を避けるためにしたこと

- 既存共有部品（`lab/_components/ModernSidebar.tsx` / `LabFrame.tsx` / `Modern*`）は **一切変更していない**。variant-k は遷移サイドバー等を **専用フォーク**で新規実装（後方互換 optional props すら追加不要）。
- 既存 Variant A〜K のファイルは無改変。
- `lab/page.tsx` は `AREAS` に **1件追加のみ**（既存エントリ・表示は不変）。`LayoutDashboard` アイコンを import 追加。
- テーマは root div の CSS 変数上書きのみ。`globals.css` は非変更。

## 8. まだ作り込んでいない画面

Tier1（段階3）／Tier2 案1・案2トグル（段階4）／あとで見る3セクション（段階5）／AVP 候補テーブル＋2×2（段階5）／ランキング操作付きテーブル（段階6）／検索 高機能フィルタ（段階6）／設定 scan-first（段階6）。analysis は対象外（仮ページのみ）。

## 9. 段階3に進む前の確認事項

- 暫定バッジ色（Tier1=青 / Tier2=ティール）でよいか。
- ランディング `/lab/variant-k` の構成（自動リダイレクトせず導線カードを置く方針）でよいか。
- サイドバーのナビ・グルーピング見出し（判定／消化・再生／探す・俯瞰／システム）でよいか。
- Runtime control の表示密度（コンパクト・停止ボタン disabled）でよいか。
- 旧 `/lab/tier1-*/variant-k`（Tier1 単独 LAB 案）を別途作るか（段階3で判断）。

## 10. スクショ保存先

`frontend/src/app/lab/variant-k/_review/stage2/` 配下に保存（命名は既存 `_review` 慣習に倣う。`full-*.png` 等）。最低: `/lab/variant-k` 全体・`/tier1`・`/tier2`・`/analysis`・Runtime control が見える状態。取得状況は本メモ末尾に追記する。

### スクショ取得状況（2026-06-28 取得）
`cd frontend && npm run dev`（frontend-only。`run_dev.bat` は DB バックアップ/マイグレーションを走らせるため使わない）で起動し、ビューポート 1440×1000、Playwright MCP で取得。保存先 `_review/stage2/`:

- `full-landing.png` — `/lab/variant-k`（導線カード＋サイドバー＋Runtime control 下部が可視）
- `full-tier1.png` — `/lab/variant-k/tier1`（プレースホルダー＋Tier1 アクティブ）
- `full-tier2.png` — `/lab/variant-k/tier2`
- `full-analysis.png` — `/lab/variant-k/analysis`（仮ページ）

Runtime control（FastAPI/Next.js 個別・「アプリを停止」disabled）は全画面のサイドバー下部に常時表示され、全スクショに写っている。

> 備考: コンソールに出る fetch エラーは、frontend-only 起動のため本体ルートの実 `SidebarNav` が FastAPI(:8000) を叩いて失敗するもの。variant-k（モック）とは無関係で、`npm run build` はクリーン通過。
