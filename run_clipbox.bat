@echo off
rem このバッチファイルは ClipBox を起動します
cd /d %~dp0
streamlit run streamlit_app.py
