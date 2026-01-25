# Streamlit 起動後に画面が空白になる問題（2026-01-11）

## 概要
リファクタリング後、`streamlit run streamlit_app.py` を起動してもメイン画面が表示されず、Streamlit の上部バー（Stop / Deploy アイコン）のみが表示される。

## 再現手順
1. 以下で起動  
   `python -m streamlit run streamlit_app.py --server.headless true --server.port 8501 --server.address 127.0.0.1`
2. ブラウザで `http://127.0.0.1:8501` を開く。

## 実際の挙動
- 画面全体が白背景で、左上に何も表示されない。
- 右上に Streamlit の Stop / Deploy アイコンのみ表示。
- `document.body.innerText` は `"Deploy"` のみ。
- HTTP ステータスは 200 で応答している。
- 標準出力・標準エラー（`artifacts/streamlit_ui_run.log`, `artifacts/streamlit_ui_run.err`）にエラー出力なし。
- スクリーンショット: `artifacts/streamlit_ui.png`

## 想定との乖離
通常はサイドバー・動画一覧などが表示されるが、UI 要素が一切描画されていない。

## 影響範囲
- ユーザーはアプリを操作できないため、全機能が実質利用不可。

## 追加観察・推測
- `streamlit_app.py` の末尾を確認すると全体の行数が約 489 行まで短縮されており、`main` 呼び出しやレンダリング処理が欠落している可能性が高い。リファクタ中の自動置換でファイルが途中まで削除された疑いあり。

## 対応案（案）
1. `streamlit_app.py` のバックアップを確認し、リファクタ前の完全版とマージする。
2. `main()`（またはトップレベルのレンダリング呼び出し）を復元し、サイドバー・タブ描画処理が呼ばれるようにする。
3. `python -m py_compile` と手動 UI チェックを再実施。
4. 可能なら自動 E2E（playwright）で「サイドバーのテキストが描画されること」を健康チェックに追加。

## 添付
- スクリーンショット: `artifacts/streamlit_ui.png`
