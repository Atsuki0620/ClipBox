## 目的
- 不要タブ（ランダム再生・統計・スナップショット）を非表示にしてUIを簡素化
- 未判定ランダム/表示設定/フィルタの使い勝手改善

## 変更概要
- streamlit_app: タブを動画一覧/未判定ランダム/分析/設定の4つに縮小、不要タブを削除
- 未判定ランダム: 表示件数をラジオ(5/10/15/20・デフォルト10)に変更
- 表示設定: デフォルトタイトル長60、4列レイアウトでバッジとスライダーを再配置
- フィルタ: 表示設定直下に移動して操作性を整理
- 不要コードを archive/unused_tabs/ に退避（random_tab, extra_tabs_unused）
- 設定タブのみ残したシンプルな ui/extra_tabs.py に差し替え

## テスト
- python -m py_compile streamlit_app.py ui/library_tab.py ui/unrated_random_tab.py ui/components/display_settings.py ui/extra_tabs.py

## 注意
- data/user_config.json や .claude/settings.local.json は含めていません
