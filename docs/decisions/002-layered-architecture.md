# ADR 002: core/ をUI非依存にする（3層アーキテクチャ）

**日付**: 2026-01-25
**状態**: 採用済み

---

## 背景

ClipBoxはStreamlitで実装されているが、将来的にFlask/FastAPIへの移行が想定されている。
当初、ビジネスロジック内に `import streamlit as st` が混入していた（キャッシュ関数など）。
UIフレームワークをビジネスロジックに混ぜると、移行時にcore/以下を全書き直しする必要が生じる。

---

## 決定

以下の3層に厳格に分離する:

```
UI層    : streamlit_app.py, ui/*.py  ← st を使ってよい
Core層  : core/*.py                  ← st を import 禁止
Data層  : core/database.py, SQLite
```

具体的なルール:
- `core/` 配下のファイルは `import streamlit` しない
- `@st.cache_data` 関数は `ui/cache.py` に集約する
- `core/app_service.py` はUI層のファサードだが、st には依存しない

---

## 却下した代替案

| 案 | 却下理由 |
|----|---------|
| ビジネスロジックとUIを同一ファイルに書く | 移行時に全書き直しが必要。テストも困難。 |
| core/ に st.cache_data を置く | streamlit 依存がcore/に侵食する。unittest でimportエラーになる。 |
| 全部 streamlit_app.py に書く | スパゲッティ化。1ファイル1000行超えは保守不能。 |

---

## トレードオフ

**許容した制約**:
- レイヤーを意識してコードを書く必要があり、初期の学習コストがある。
- キャッシュ関数を ui/cache.py に置くため、キャッシュクリアの呼び出し元が UI 側に集中する。

**得たもの**:
- `core/` は pytest でそのままユニットテストできる（streamlit 不要）。
- Flask/FastAPI移行時は `streamlit_app.py` と `ui/` だけ書き直せばよい。
- `core/video_manager.py` 等は完全に再利用可能。
- CI/CD でコアロジックだけテストを回せる。
