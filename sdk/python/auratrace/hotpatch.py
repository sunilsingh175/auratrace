"""
Runtime hot-patching module for live function bytecode replacement.
"""
import logging
from typing import Callable, Any

log = logging.getLogger("auratrace.hotpatch")


def apply_hotpatch(target_module: Any, function_name: str, new_function: Callable):
    """Replace a module function in-memory dynamically."""
    try:
        setattr(target_module, function_name, new_function)
        log.info(f"Hotpatch applied to {target_module.__name__}.{function_name}")
        return True
    except Exception as e:
        log.error(f"Failed to apply hotpatch: {e}")
        return False
