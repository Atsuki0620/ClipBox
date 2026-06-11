<!--
記入の前に docs/context/AI_WORKFLOW.md を読むこと（読む順 §A / テスト方針 §E / スモーク §F）。
チェックは「該当する」もののみ付ける。該当しない欄は「変更なし」と明記する。
-->

## 目的
<!-- 何を・なぜ。関連 issue / 会話があればリンク -->

## 変更範囲
- [ ] backend（`core/` / `api/`）
- [ ] frontend（Next.js）
- [ ] docs のみ
- [ ] DB スキーマ / migration

## 仕様との対応
<!-- SPEC_NEXTJS.md の該当節（例: §6 AVP）。挙動を変えていないなら「現行仕様維持」と明記 -->

## DB 影響
- [ ] スキーマ変更なし
<!-- ありの場合: 追加/変更カラム・migration 番号・DATA_MODEL.md 更新済み・DB バックアップ手順 -->

## API 影響
- [ ] エンドポイント変更なし
<!-- ありの場合: 追加/変更したパスと API_SPEC.md の更新有無 -->

## フロント影響
- [ ] localStorage キー（`clipbox-avp` / `clipbox-playback`）・状態の永続境界に変更なし
<!-- ありの場合: 変更内容と SPEC_NEXTJS.md §0 との整合 -->

## テスト結果
<!-- AI_WORKFLOW.md §E のマトリクスに従い、該当するものを実行して結果を貼る -->
- [ ] `python -m pytest`（`core/` / API 変更時は必須）:
- [ ] `npm run lint`（frontend 変更時）:
- [ ] `npm run typecheck`（frontend 変更時）:

## 手動確認結果
<!-- AI_WORKFLOW.md §F スモークの該当領域。実機確認した項目を記載 -->

## 未対応 / 次PR
<!-- スコープ外・既知の残課題 -->

## リスク
- [ ] 禁止事項（`AGENTS.md` 末尾 / `SPEC_NEXTJS.md` §12）に抵触しない
<!-- 想定される副作用・ロールバック方法 -->
