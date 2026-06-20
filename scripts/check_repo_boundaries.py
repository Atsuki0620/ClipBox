"""リポジトリ構成境界（repository boundary guardrails）を検査するスクリプト。

役割:
    プロジェクトルート整理後の構成が再び荒れないよう、構造上の境界違反を検出する。
    1. archive 境界 ... 現行コードから `archive/legacy-code/` / `archive/streamlit/` を
       参照・import していないか。
    2. ルート直下の荒れ防止 ... Notebook・DB コピー・一時ファイルなどが git 管理対象
       (tracked) に混入していないか。
    3. `docs/context/` 正本台帳 ... 現行正本ドキュメントが存在し、退避済みの旧概要
       (`PROJECT_OVERVIEW.md`) が復活していないか。

実行 (CI / ローカル共通):
    python scripts/check_repo_boundaries.py
    違反があれば一覧を stderr に出して終了コード 1。無ければ OK で終了コード 0。

参考情報つき (ローカル想定。終了コードには影響しない):
    python scripts/check_repo_boundaries.py --inventory
    未追跡 / ignore 済みファイルの棚卸しを「件数のみ」で分類表示する
    （具体的なファイル名・パスは出さない）。

【設計制約】
    - 標準ライブラリと `git` コマンド (subprocess) のみで動く。追加依存を持たない。
    - tracked ファイル (`git ls-files`) のみを失敗条件にする。ローカルに在るだけの
      未追跡 / ignore 済みファイルは CI を落とさない（棚卸しは参考表示のみ）。
    - 実データ名・動画名・ローカルフルパス・ファイル内容はログに出さない。違反検出時に
      表示するのは tracked パス（git 管理対象＝機微でない）に限る。`--inventory` は
      件数のみを出し、未追跡 / ignore 済みの具体的なファイル名・パスは表示しない
      （リポジトリ相対パスでも動画名・個人情報を含み得るため）。
    - `streamlit` という単語自体は禁止しない（ポート 8501 監視など現行仕様の検出は正常）。
      禁止するのは現行コードからの `archive/legacy-code/` / `archive/streamlit/` 参照のみ。

【依存関係】
    - `git`（リポジトリルートで実行されること）。
    - 同種ガードレール `scripts/check_notebook_outputs.py` と作法を揃える。
"""
from __future__ import annotations

import fnmatch
import subprocess
import sys
from pathlib import Path

# このスクリプト自身は検出語リテラルを含むため、archive 境界スキャンから除外する。
_SELF_PATH = "scripts/check_repo_boundaries.py"

# archive 境界チェックの検査対象（現行実装領域）。
_CURRENT_CODE_DIR_PREFIXES = ("api/", "core/", "scripts/", "tests/", "frontend/")
_CURRENT_CODE_FILES = ("api_app.py", "config.py", "run_dev.bat", "run_api.bat")

# 走査する拡張子（import / 参照が問題になるソースのみ。lock / バイナリは除外）。
_SCANNED_SUFFIXES = (".py", ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".bat")

# 現行コードに現れてはいけない archive 参照トークン（部分一致・大小区別あり）。
# 注: "archive\\legacy-code" は Windows 区切りのリテラル archive\legacy-code を表す。
_ARCHIVE_REFERENCE_TOKENS = (
    "from archive",
    "import archive",
    "archive/legacy-code",
    "archive\\legacy-code",
    "archive/streamlit",
    "archive\\streamlit",
)

# ルート直下の荒れ防止: tracked に在ってはいけないもの。
_FORBIDDEN_TRACKED_PREFIXES = (
    "notebooks/",              # ルート notebooks は再作成しない方針
    "docs/analysis/private/",  # 動画名・視聴情報・DB コピー
    "docs/analysis/outputs/",  # 分析出力
)
# DB 本体に加え、SQLite 実行時の周辺（サイドカー）ファイルも tracked 混入を禁止する。
_FORBIDDEN_TRACKED_SUFFIXES = (
    ".db", ".sqlite", ".sqlite3",
    ".db-wal", ".db-shm", ".db-journal",
    ".sqlite-wal", ".sqlite-shm", ".sqlite-journal",
    ".sqlite3-wal", ".sqlite3-shm", ".sqlite3-journal",
)
_FORBIDDEN_TRACKED_BASENAMES = ("video_analysis.ipynb", "_ul", "demo.html", "nul")
_FORBIDDEN_TRACKED_GLOBS = ("videos_private_*.db",)

# docs/context/ 正本台帳: 必須ファイルと、復活してはいけないファイル。
_REQUIRED_CONTEXT_DOCS = (
    "docs/context/OVERVIEW.md",
    "docs/context/SPEC_NEXTJS.md",
    "docs/context/AI_WORKFLOW.md",
    "docs/context/REPO_STRUCTURE.md",
    "docs/context/IMPLEMENTATION_GUIDE.md",
    "docs/context/GLOSSARY.md",
)
_FORBIDDEN_CONTEXT_DOCS = ("docs/context/PROJECT_OVERVIEW.md",)

# 棚卸し（--inventory）で ignore 済みエントリを件数集計するカテゴリ定義。
# 件数のみ表示し、具体的なファイル名・パスは出さない（動画名・個人情報が
# 含まれ得るため）。__pycache__ は階層を問わず "cache" 扱い（_categorize_ignored）。
_IGNORED_CATEGORIES = (
    ("cache", (".pytest_cache/", ".ruff_cache/", ".mypy_cache/", ".coverage")),
    ("virtualenv", ("venv/", ".venv/")),
    ("data", ("data/",)),
    ("artifacts", ("artifacts/",)),
    ("frontend build", (
        "frontend/.next/", "frontend/node_modules/", "frontend/out/",
        "frontend/next-env.d.ts", "frontend/tsconfig.tsbuildinfo",
    )),
    ("analysis local", (
        "docs/analysis/private/", "docs/analysis/data/",
        "docs/analysis/notebooks/",
    )),
    ("tooling/other", (".claude/", ".playwright-mcp/", "archive/ui_prototypes/")),
)


def _git_lines(args: list[str]) -> list[str]:
    """git コマンドを実行し、標準出力を行リストで返す。"""
    result = subprocess.run(
        ["git", *args], capture_output=True, text=True, encoding="utf-8"
    )
    return [line for line in (result.stdout or "").splitlines() if line.strip()]


def _tracked_files() -> list[str]:
    return _git_lines(["ls-files"])


def _is_current_code(path: str) -> bool:
    if path == _SELF_PATH:
        return False
    if path in _CURRENT_CODE_FILES:
        return True
    return path.startswith(_CURRENT_CODE_DIR_PREFIXES)


def check_archive_boundaries(tracked: list[str]) -> list[str]:
    """現行コードから archive への参照 / import を検出する。"""
    errors: list[str] = []
    for path in tracked:
        if not _is_current_code(path):
            continue
        if not path.endswith(_SCANNED_SUFFIXES):
            continue
        try:
            text = Path(path).read_text(encoding="utf-8", errors="ignore")
        except OSError as exc:
            errors.append(f"  {path}: 読み込みエラー ({exc})")
            continue
        for lineno, line in enumerate(text.splitlines(), start=1):
            for token in _ARCHIVE_REFERENCE_TOKENS:
                if token in line:
                    errors.append(
                        f"  {path}:{lineno}: 現行コードから archive を参照しています"
                        f" ('{token}')"
                    )
    return errors


def check_root_cleanliness(tracked: list[str]) -> list[str]:
    """tracked に混入してはいけないファイルを検出する。"""
    errors: list[str] = []
    for path in tracked:
        name = path.rsplit("/", 1)[-1]
        flagged = (
            path.startswith(_FORBIDDEN_TRACKED_PREFIXES)
            or path.endswith(_FORBIDDEN_TRACKED_SUFFIXES)
            or name in _FORBIDDEN_TRACKED_BASENAMES
            or any(fnmatch.fnmatch(name, g) for g in _FORBIDDEN_TRACKED_GLOBS)
        )
        if flagged:
            errors.append(
                f"  {path}: ルート整理方針に反する追跡ファイルです"
                " (Notebook / DB コピー / 一時ファイル等は commit しない)"
            )
    return errors


def check_context_ledger() -> list[str]:
    """docs/context/ の現行正本が維持されているか軽く検査する。"""
    errors: list[str] = []
    for doc in _REQUIRED_CONTEXT_DOCS:
        if not Path(doc).is_file():
            errors.append(f"  {doc}: 現行正本ドキュメントが見つかりません")
    for doc in _FORBIDDEN_CONTEXT_DOCS:
        if Path(doc).is_file():
            errors.append(
                f"  {doc}: 退避済みの旧概要が docs/context/ に復活しています"
                " (現行正本は OVERVIEW.md。旧概要は docs/archive/ へ)"
            )
    return errors


def _categorize_ignored(path: str) -> str | None:
    """ignore 済みエントリを標準カテゴリ名に分類する（未分類は None）。"""
    if "__pycache__" in path:
        return "cache"
    for name, prefixes in _IGNORED_CATEGORIES:
        if path.startswith(prefixes):
            return name
    return None


def print_inventory() -> None:
    """未追跡 / ignore 済みファイルの棚卸しを「件数のみ」で参考表示する（非失敗）。

    動画名・個人情報・ローカル事情がファイル名やパスに含まれ得るため、
    具体的なファイル名・ディレクトリ名・相対パスは一切表示しない。
    """
    print("\n--- ローカル棚卸し (件数のみ・参考。終了コードには影響しません) ---")

    untracked = _git_lines(["ls-files", "--others", "--exclude-standard"])
    print(f"\n[未追跡・非ignore] {len(untracked)} 件")

    ignored = [
        line[3:] for line in _git_lines(["status", "--ignored", "--short"])
        if line.startswith("!!")
    ]
    counts: dict[str, int] = {}
    unknown = 0
    for path in ignored:
        category = _categorize_ignored(path)
        if category is None:
            unknown += 1
        else:
            counts[category] = counts.get(category, 0) + 1

    print("[ignore 済み・標準カテゴリ]")
    shown = [(name, counts[name]) for name, _ in _IGNORED_CATEGORIES if counts.get(name)]
    if shown:
        for name, count in shown:
            print(f"  {name}: {count} 件")
    else:
        print("  なし")
    print(f"[ignore 済み・未分類] {unknown} 件")

    print(
        "\n※ 件数のみ表示しています。具体的なファイル名・パスは出力しません"
        "（動画名・個人情報を含む可能性があるため）。"
        "\n  詳細はローカルで `git status --short` / `git status --ignored --short` を"
        "確認してください。出力を Pull request 本文やチャットに貼らないでください。"
    )


def main() -> int:
    tracked = _tracked_files()
    if not tracked:
        print(
            "ERROR: git 管理ファイルを取得できません。"
            "リポジトリルートで実行してください。",
            file=sys.stderr,
        )
        return 1

    errors: list[str] = []
    errors.extend(check_archive_boundaries(tracked))
    errors.extend(check_root_cleanliness(tracked))
    errors.extend(check_context_ledger())

    if errors:
        print("\nERROR: リポジトリ構成境界の違反を検出しました。\n", file=sys.stderr)
        for msg in errors:
            print(msg, file=sys.stderr)
        print(
            "\n対処の指針: docs/context/REPO_STRUCTURE.md の分類ルールに従い、"
            "現行コードから archive を参照しない / ルート直下に一時ファイルを"
            "増やさない / docs/context/ は現行正本のみ、を満たしてください。\n",
            file=sys.stderr,
        )
        if "--inventory" in sys.argv:
            print_inventory()
        return 1

    print(
        f"OK: repository boundaries clean "
        f"(archive / root / docs-context, {len(tracked)} tracked files checked)"
    )
    if "--inventory" in sys.argv:
        print_inventory()
    return 0


if __name__ == "__main__":
    sys.exit(main())
