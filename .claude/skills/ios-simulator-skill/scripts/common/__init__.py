"""
Common utilities shared across iOS simulator scripts.

This module centralizes genuinely reused code patterns to eliminate duplication
while respecting Jackson's Law - no over-abstraction, only truly shared logic.

Organization:
- device_utils: Device detection, command building, coordinate transformation
- idb_utils: IDB-specific operations (accessibility tree, element manipulation)
- cache_utils: Progressive disclosure caching for large outputs
- screenshot_utils: Screenshot capture with file and inline modes
"""

from .cache_utils import ProgressiveCache, get_cache
from .device_utils import (
    build_idb_command,
    build_simctl_command,
    get_booted_device_udid,
    get_device_screen_size,
    resolve_udid,
    transform_screenshot_coords,
)
from .idb_utils import (
    count_elements,
    flatten_tree,
    get_accessibility_tree,
    get_screen_size,
)
from .screenshot_utils import (
    capture_screenshot,
    format_screenshot_result,
    generate_screenshot_name,
    get_size_preset,
    resize_screenshot,
)

__all__ = [
    # cache_utils
    "ProgressiveCache",
    # device_utils
    "build_idb_command",
    "build_simctl_command",
    # screenshot_utils
    "capture_screenshot",
    # idb_utils
    "count_elements",
    "flatten_tree",
    "format_screenshot_result",
    "generate_screenshot_name",
    "get_accessibility_tree",
    "get_booted_device_udid",
    "get_cache",
    "get_device_screen_size",
    "get_screen_size",
    "get_size_preset",
    "resize_screenshot",
    "resolve_udid",
    "transform_screenshot_coords",
]
