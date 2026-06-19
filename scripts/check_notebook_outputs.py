"""
GitHub に動画名・個人データが漏洩しないことを確認するスクリプト。

CI (全件スキャン):
    python scripts/check_notebook_outputs.py

pre-commit hook (staged のみ):
    python scripts/check_notebook_outputs.py --staged
"""
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

# 分析エクスポートと見なす拡張子
_EXPORT_EXTENSIONS = {".csv", ".xlsx", ".tsv", ".parquet"}

# エクスポートファイルを禁止するディレクトリ（posix prefix で比較）
# docs/analysis/data/ と docs/analysis/notebooks/ は匿名集計のみ含むため許可。
# docs/analysis/private/ は動画名・視聴情報・DB コピーを含み禁止。
_SENSITIVE_DIR_PREFIXES = ("notebooks/", "docs/analysis/private/")


def _get_staged_paths() -> list[Path]:
    result = subprocess.run(
        ["git", "diff", "--cached", "--name-only", "--diff-filter=ACMR"],
        capture_output=True,
        text=True,
    )
    return [Path(line) for line in result.stdout.strip().splitlines() if line]


def _get_all_notebook_paths() -> list[Path]:
    return [
        p
        for p in Path(".").rglob("*.ipynb")
        if ".ipynb_checkpoints" not in p.parts
    ]


def _check_notebook_outputs(path: Path) -> list[str]:
    try:
        nb = json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:
        return [f"  {path}: 読み込みエラー ({exc})"]
    errors = []
    for i, cell in enumerate(nb.get("cells", []), start=1):
        if cell.get("outputs"):
            errors.append(
                f"  {path}: セル {i} ({cell.get('cell_type', '?')}) に outputs が残っています"
            )
    return errors


def _check_export_files(paths: list[Path]) -> list[str]:
    errors = []
    for path in paths:
        if path.suffix in _EXPORT_EXTENSIONS:
            posix = path.as_posix()
            if any(posix.startswith(prefix) for prefix in _SENSITIVE_DIR_PREFIXES):
                errors.append(
                    f"  {path}: 分析エクスポートファイルは commit 禁止"
                    " (動画名が含まれる可能性があります)"
                )
    return errors


def main() -> int:
    staged_mode = "--staged" in sys.argv
    errors: list[str] = []

    if staged_mode:
        staged_paths = _get_staged_paths()
        notebook_paths = [p for p in staged_paths if p.suffix == ".ipynb"]
        errors.extend(_check_export_files(staged_paths))
    else:
        notebook_paths = _get_all_notebook_paths()

    for nb_path in notebook_paths:
        errors.extend(_check_notebook_outputs(nb_path))

    if errors:
        print(
            "\nERROR: GitHub に動画名・個人データが漏洩する可能性があります。\n",
            file=sys.stderr,
        )
        for msg in errors:
            print(msg, file=sys.stderr)
        print(
            "\n対処法 (outputs 削除): jupyter nbconvert --clear-output <ファイル>",
            file=sys.stderr,
        )
        print(
            "対処法 (エクスポートファイル): git restore --staged <ファイル> でステージから外す\n",
            file=sys.stderr,
        )
        return 1

    if not staged_mode:
        print(f"OK: {len(notebook_paths)} notebook(s) checked -- no outputs found")
    return 0


if __name__ == "__main__":
    sys.exit(main())
