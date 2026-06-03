"""
ClipBox FastAPI バックエンド層（Phase 3-A 基盤）。

役割:
    Streamlit と並走する HTTP API を提供する。`core/` のビジネスロジックを共有し、
    将来的に Next.js フロントエンドのバックエンドとなる。

【設計制約】
- このパッケージは `core.app_service`（ファサード）のみを呼ぶ。
  `VideoManager` や `core.database` を直接 import しない（境界一本化）。
- `streamlit` を import しない（API は Streamlit 非依存）。
- Phase 3-A は read-only。DB へ書き込まない（起動時マイグレーションも行わない）。

【依存関係】
core.app_service → (VideoManager / database / ...) を内部委譲
api.schemas（Pydantic モデル） / api.videos（ルーター） → api_app（エントリーポイント）
"""
