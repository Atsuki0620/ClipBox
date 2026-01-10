"""
Backward compatibility shim for play_history access.
実体は core/database.py に集約。
"""

from typing import Optional  # noqa: F401
from core.database import insert_play_history  # noqa: F401
