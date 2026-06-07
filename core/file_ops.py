"""
File/OS related operations.
現行の scanner をラップし、UI 側からの直接利用を防ぐ。
"""

from pathlib import Path
from typing import Optional, Sequence, Union

from core.scanner import FileScanner

PathLike = Union[str, Path]


def create_file_scanner(
    library_roots: Sequence[PathLike],
    protected_roots: Optional[Sequence[PathLike]] = None,
) -> FileScanner:
    return FileScanner(library_roots, protected_roots=protected_roots)
