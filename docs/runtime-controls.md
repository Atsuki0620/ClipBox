# Runtime Controls

ClipBox の開発環境では、Next.js サイドバーに `Streamlit` / `FastAPI` / `Next.js` の runtime lamp を表示します。

## 使い方

- 緑: 起動中
- 灰: 停止中
- 黄: 状態取得不可
- 停止は各行の `停止` ボタンから明示的に行います。

## 注意

- ブラウザを閉じても、`Streamlit` / `FastAPI` / `Next.js` は自動では止まりません。
- `Next.js` を停止すると、現在の画面も終了します。
- 状態は FastAPI の `/api/runtime` を短い間隔で監視します。FastAPI を止めた後は、表示の更新は再起動まで失敗します。

## API

これは開発時用の手動停止コントロールです（ドメイン API ではありません）。

- `GET /api/runtime` — 各サービスの状態（`running` / `stopped` / `unknown`）と PID を返す。
- `POST /api/runtime/{service}/stop` — 指定サービスを停止（未知サービスは 404、停止失敗は 500）。

実装は `api/runtime.py` → `core/runtime_control.py`（`psutil` でポート→PID 判定）。
