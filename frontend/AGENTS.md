<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## ClipBox フロント固有の規約（作業前に必読）

- **作業手順の正本**: `../docs/context/AI_WORKFLOW.md`（読む順・計画/小修正の境界・テスト方針・PRチェック）。
- **状態の永続境界**: `../docs/context/SPEC_NEXTJS.md` §0。**DB に持つ状態と localStorage に持つ状態を取り違えない・移動しない**。
  - localStorage キーは `clipbox-avp`（AVP候補/再生対象）と `clipbox-playback`（再生中ハイライト）。実装は `src/lib/store.ts`。
  - フィルタ/ソートは永続しない（メモリのみ。`useLibraryStore` に persist なし）。
- API レスポンスは **snake_case のまま**扱う（`src/lib/types.ts`）。
- 変更後チェック: `npm run lint` ＋ `npm run typecheck`（= `tsc --noEmit`）＋ AI_WORKFLOW §F の手動スモーク。自動テストは無い。
