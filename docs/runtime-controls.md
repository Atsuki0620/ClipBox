# Runtime Controls

ClipBox の開発環境では、Next.js サイドバーに `Streamlit` / `FastAPI` / `Next.js` の runtime lamp を表示します。

## 有効化

Runtime control は**強い副作用（ブラウザからプロセス停止）**を持つため、既定では無効です。
環境変数 `CLIPBOX_ENABLE_RUNTIME_CONTROL=1` を設定して FastAPI を起動したときのみ `/api/runtime*` が公開されます
（`run_dev.bat` は dev 一括起動時に自動で設定します）。無効時、フロントは `/api/runtime` の 404 を検知して
lamp/停止パネルを表示しません。

## 使い方

- 緑: 起動中 / 灰: 停止中 / 黄: 状態取得不可
- 停止ボタンは2系統:
  - **Streamlit**: 個別に停止。
  - **Web/API**: FastAPI と Next.js を一括停止（Next.js → FastAPI の順）。FastAPI は本 API の実行主体のため、
    停止すると画面更新もできなくなる。停止操作後は応答を待たず `about:blank` に遷移します。
- ClipBox のプロセスとして確認できないポート占有は停止されません（その旨が確認ダイアログに表示されます）。

## 注意

- ブラウザを閉じても、`Streamlit` / `FastAPI` / `Next.js` は自動では止まりません。
- `Web/API` を停止すると、現在の画面も終了します。
- 状態は FastAPI の `/api/runtime` を短い間隔で監視します。FastAPI を止めた後は、表示の更新は再起動まで失敗します。

## API（dev only）

これは開発時用の手動停止コントロールです（ドメイン API ではありません）。`CLIPBOX_ENABLE_RUNTIME_CONTROL=1` のときのみ有効。

- `GET /api/runtime` — 各サービスの状態（`running` / `stopped` / `unknown`）と PID を返す。
- `POST /api/runtime/{service}/stop` — 指定サービスを停止。
- `POST /api/runtime/web-stack/stop` — Web スタック（Next.js → FastAPI）を一括停止。
- 戻り status の HTTP マッピング: success→200 / **ClipBox と確認できず停止しない→409** / 失敗→500 / 未知サービス→404。

停止対象は **cwd がリポジトリ配下 AND cmdline にサービス固有マーカー**を満たすプロセスに限定（`uvicorn --reload` の
子/親構成にも対応）。実装は `api/runtime.py` → `core/runtime_control.py`（`psutil` でポート→PID 判定）。
