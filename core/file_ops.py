"""
File/OS related operations.
現行の scanner をラップし、UI 側からの直接利用を防ぐ。
"""

from typing import List

from core.scanner import FileScanner


def create_file_scanner(library_roots: List[str]) -> FileScanner:
    return FileScanner(library_roots)
