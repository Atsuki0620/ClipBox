"""
Backward compatibility shim.
実体は core/config_utils.py に集約したので、既存インポートを維持するために re-export する。
"""

from core.config_utils import load_user_config, save_user_config  # noqa: F401
