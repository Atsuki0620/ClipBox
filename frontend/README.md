# ClipBox Frontend

ClipBox の現行 UI です。Next.js 16 App Router / React 19 / TypeScript で実装し、FastAPI（`localhost:8000`）をバックエンド API として利用します。

## 役割

- Tier1 / Tier2 / AVP / ランキング / 分析 / 検索 / 設定の現行 UI を提供する。
- サーバー状態は FastAPI 経由で取得・更新する。
- AVP 候補・再生対象・再生中ハイライトなど、ブラウザ限定の状態は Zustand + localStorage で保持する。

画面・状態の正本は `../docs/context/SPEC_NEXTJS.md`、作業手順は `../docs/context/AI_WORKFLOW.md` を参照してください。

## 前提

- FastAPI が `http://localhost:8000` で起動していること。
- API ベース URL は `NEXT_PUBLIC_API_BASE` で上書きできます。未設定時は `http://localhost:8000/api` を使います。
- このアプリはローカル専用ツールの UI です。Vercel など外部ホスティングへのデプロイは運用前提ではありません。

## 開発起動

```bash
npm run dev
```

ブラウザで `http://localhost:3000` を開きます。

## ビルド

```bash
npm run build
```

本番ビルドをローカルで起動する場合:

```bash
npm run start
```

## 品質ゲート

```bash
npm run typecheck
npm run lint
npm run build
```

フロントエンドには自動テストランナーを導入していません。変更時は型チェック、lint、ビルドに加えて `../docs/context/TESTING.md` の手動確認範囲を確認してください。

## 主要技術

- Next.js 16 App Router
- React 19
- TypeScript
- Zustand
- TanStack Query
- Recharts
