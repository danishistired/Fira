"""
Android view-hierarchy simplifier for ARGUS Autonomous Explorer.

Parses the raw XML dump from `uiautomator dump` (or uiautomator2's
`dump_hierarchy()`) and reduces it to a compact, indexed, LLM-friendly
text representation.

Raw dumps can be 2,000–10,000 lines of deeply nested <node> elements.
We filter to ~40 actionable elements per screen and format each as a
single line with the properties the LLM needs: index, class, text,
resource-id, bounds, and interaction flags.

System dialogs (permission grants, package installer) are detected so
the LLM can be instructed to handle them appropriately.
"""

from __future__ import annotations

import hashlib
from dataclasses import dataclass, field
from typing import Optional

# ---- Constants ----

# Window packages that indicate a system dialog is in front.
# When these are active, we only show clickable buttons (Allow / Deny / OK).
SYSTEM_DIALOG_PACKAGES = frozenset({
    "com.android.permissioncontroller",
    "com.google.android.permissioncontroller",
    "com.android.packageinstaller",
    "com.google.android.packageinstaller",
    "com.android.systemui",
})

# Packages / package prefixes to always hide (status bar, nav bar, launcher chrome).
_HIDDEN_PACKAGE_PREFIXES = (
    "com.android.systemui",
    "com.google.android.apps.nexuslauncher",
    "com.android.launcher",
)

# Element classes that are never actionable on their own — we skip them
# unless they carry text / content-desc a user cares about.
_STRUCTURAL_CLASSES = frozenset({
    "android.widget.FrameLayout", "android.widget.LinearLayout",
    "android.widget.RelativeLayout", "android.widget.ConstraintLayout",
    "android.view.ViewGroup", "android.view.View",
    "android.widget.ScrollView", "android.widget.HorizontalScrollView",
})

# Classes we always keep regardless of other filters.
_ALWAYS_KEEP_CLASSES = frozenset({
    "android.widget.EditText", "android.widget.Button",
    "android.widget.ImageButton", "android.widget.CheckBox",
    "android.widget.RadioButton", "android.widget.Switch",
    "android.widget.ToggleButton", "android.widget.Spinner",
    "android.widget.SeekBar", "android.widget.RatingBar",
})


@dataclass
class UIElement:
    """A single actionable element parsed from the view hierarchy."""
    index: int
    text: str = ""
    content_desc: str = ""
    resource_id: str = ""
    class_name: str = ""
    package: str = ""
    bounds: tuple[int, int, int, int] = (0, 0, 0, 0)  # x1, y1, x2, y2
    clickable: bool = False
    long_clickable: bool = False
    editable: bool = False
    focusable: bool = False
    checkable: bool = False
    checked: bool = False
    scrollable: bool = False
    enabled: bool = True
    password: bool = False
    depth: int = 0

    @property
    def center(self) -> tuple[int, int]:
        """Return (cx, cy) centre of the bounds rectangle."""
        x1, y1, x2, y2 = self.bounds
        return ((x1 + x2) // 2, (y1 + y2) // 2)

    @property
    def area(self) -> int:
        x1, y1, x2, y2 = self.bounds
        return max(0, x2 - x1) * max(0, y2 - y1)


@dataclass
class ScreenState:
    """Summary of the current screen derived from the hierarchy."""
    activity: str = ""            # e.g. ".ui.LoginActivity"
    package: str = ""             # e.g. "com.example.app"
    window_size: tuple[int, int] = (0, 0)  # (width, height)
    is_system_dialog: bool = False
    element_count_total: int = 0   # before filtering
    element_count_shown: int = 0   # after filtering


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def parse_hierarchy(xml_text: str, target_package: str) -> tuple[list[UIElement], ScreenState]:
    """Parse a raw uiautomator XML dump into actionable elements + screen metadata.

    Args:
        xml_text: Raw XML string from ``adb shell uiautomator dump`` or
                  ``uiautomator2.Device.dump_hierarchy()``.
        target_package: The app package under investigation. Elements from
                        other packages are filtered unless they are system
                        dialog buttons.

    Returns:
        (elements, screen_state) — elements are in depth-first traversal order.
    """
    # Lazy import so the module can be imported even without lxml installed
    from lxml import etree

    try:
        root = etree.fromstring(xml_text.encode("utf-8"))
    except etree.XMLSyntaxError:
        return [], ScreenState()

    raw_elements: list[UIElement] = []
    window_package = ""
    max_x = max_y = 0
    index_counter = 0

    # Single-pass traversal: collect all nodes with their attributes
    for node in root.iter("node"):
        attrs = dict(node.attrib)
        class_name = attrs.get("class", "")
        pkg = attrs.get("package", "")
        bounds_str = attrs.get("bounds", "[0,0][0,0]")

        # Track window-level package + max bounds
        if not window_package and pkg:
            window_package = pkg

        x1, y1, x2, y2 = _parse_bounds(bounds_str)
        max_x = max(max_x, x2)
        max_y = max(max_y, y2)

        text = attrs.get("text", "") or ""
        content_desc = attrs.get("content-desc", "") or ""
        resource_id = attrs.get("resource-id", "") or ""

        # Skip purely decorative elements early
        if _should_skip_element(class_name, pkg, text, content_desc, resource_id, attrs):
            continue

        index_counter += 1
        raw_elements.append(UIElement(
            index=index_counter,
            text=text,
            content_desc=content_desc,
            resource_id=resource_id,
            class_name=class_name,
            package=pkg,
            bounds=(x1, y1, x2, y2),
            clickable=attrs.get("clickable", "false") == "true",
            long_clickable=attrs.get("long-clickable", "false") == "true",
            editable=attrs.get("editable", "false") == "true" or class_name.endswith(".EditText"),
            focusable=attrs.get("focusable", "false") == "true",
            checkable=attrs.get("checkable", "false") == "true",
            checked=attrs.get("checked", "false") == "true",
            scrollable=attrs.get("scrollable", "false") == "true",
            enabled=attrs.get("enabled", "true") == "true",
            password=attrs.get("password", "false") == "true",
            depth=int(attrs.get("depth", "0") or "0"),
        ))

    is_dialog = window_package in SYSTEM_DIALOG_PACKAGES

    # Derive a short activity name from the window package
    activity_short = ""
    if window_package == target_package:
        # Try to extract activity from the root node
        activity_short = ""  # we'll rely on app_current() at the explorer level
    elif is_dialog:
        activity_short = f"SYSTEM_DIALOG({_short_pkg(window_package)})"

    screen = ScreenState(
        activity=activity_short,
        package=window_package or target_package,
        window_size=(max_x, max_y),
        is_system_dialog=is_dialog,
        element_count_total=index_counter,
    )

    return raw_elements, screen


def filter_actionable(
    elements: list[UIElement],
    screen: ScreenState,
    max_elements: int = 40,
) -> list[UIElement]:
    """Filter elements down to the set the LLM should reason about.

    Priority order (highest first):
      1. Editable fields (EditText)
      2. Clickable / long-clickable elements
      3. Checkable elements (checkboxes, radios, switches)
      4. Text-bearing elements that may be interactive
    """
    if screen.is_system_dialog:
        # Only show clickable buttons — the LLM should Allow or Deny
        clickable = [e for e in elements if e.clickable and e.enabled]
        screen.element_count_shown = len(clickable)
        # Re-index
        for i, el in enumerate(clickable, 1):
            el.index = i
        return clickable[:max_elements]

    # Normal screen filtering
    result: list[UIElement] = []

    # Tier 1: editable
    for el in elements:
        if el.editable and el.enabled:
            result.append(el)

    # Tier 2: clickable / long-clickable / checkable
    for el in elements:
        if el in result:
            continue
        if (el.clickable or el.long_clickable or el.checkable) and el.enabled:
            result.append(el)

    # Tier 3: text-bearing (might be tappable labels, menu items)
    for el in elements:
        if el in result:
            continue
        if (el.text or el.content_desc) and el.enabled and el.area > 0:
            result.append(el)

    # Sort by depth (top-down), then y, then x — matches visual reading order
    result.sort(key=lambda e: (e.depth, e.bounds[1], e.bounds[0]))

    # Re-index
    for i, el in enumerate(result, 1):
        el.index = i

    # Truncate to max_elements, preserving editable + clickable priority
    if len(result) > max_elements:
        kept = result[:max_elements]
        omitted = len(result) - max_elements
        screen.element_count_shown = len(kept)
        # Add a synthetic note element
        note = UIElement(
            index=len(kept) + 1,
            text=f"... {omitted} more elements not shown (scroll/swipe to reveal)",
            class_name="NOTE",
        )
        kept.append(note)
        return kept

    screen.element_count_shown = len(result)
    return result


def format_for_llm(elements: list[UIElement], screen: ScreenState) -> str:
    """Format filtered elements as a compact text block for the LLM prompt.

    Example output::

        SCREEN: .LoginActivity  pkg=com.example.app  1080x1920  dialog=no
        [1]  Button      "LOGIN"             id=com.ex:id/btn     [300,1400][780,1520]  clickable
        [2]  EditText    "Email"             id=com.ex:id/email   [120,900][600,1050]   editable  focused
        [3]  EditText    "Password"          id=com.ex:id/pass    [120,1100][600,1250]  editable  password
    """
    lines: list[str] = []

    activity_str = screen.activity or "(unknown)"
    dialog_flag = "yes" if screen.is_system_dialog else "no"
    w, h = screen.window_size
    lines.append(
        f"SCREEN: {activity_str}  pkg={screen.package}  {w}x{h}  dialog={dialog_flag}"
    )
    if screen.is_system_dialog:
        lines.append("  ⚠ SYSTEM DIALOG — only clickable buttons shown")

    for el in elements:
        # Build a compact attribute string
        short_class = _short_class(el.class_name)

        # Label
        label = el.text or el.content_desc or ""
        if label:
            # Truncate long labels
            label = label.replace("\n", " ").strip()
            if len(label) > 42:
                label = label[:39] + "..."
            label = f'"{label}"'

        # Resource ID (shortened)
        rid = ""
        if el.resource_id:
            parts = el.resource_id.split("/")
            rid = parts[-1] if len(parts) > 1 else el.resource_id
            if len(rid) > 26:
                rid = rid[:23] + "..."

        # Bounds
        x1, y1, x2, y2 = el.bounds
        bounds_str = f"[{x1},{y1}][{x2},{y2}]"

        # Flags
        flags: list[str] = []
        if el.editable:
            flags.append("editable")
        if el.password:
            flags.append("password")
        if el.clickable:
            flags.append("clickable")
        if el.long_clickable:
            flags.append("long-click")
        if el.checkable:
            flags.append("checkable")
            if el.checked:
                flags.append("checked")
        if el.focusable and not el.editable:
            flags.append("focusable")
        if not el.enabled:
            flags.append("DISABLED")
        if el.scrollable and not el.clickable:
            flags.append("scrollable")

        # Build line:  [N] ClassName  "label"  id=xxx  bounds  flags
        parts: list[str] = [f"[{el.index:2d}]"]
        parts.append(f"{short_class:<11}")
        if label:
            parts.append(f"{label:<20}")
        else:
            parts.append(f"{'(no label)':<20}")
        if rid:
            parts.append(f"id={rid:<20}")
        else:
            parts.append(f"{'':>23}")
        parts.append(f"{bounds_str:<24}")
        if flags:
            parts.append("  ".join(flags))
        else:
            parts.append("(static)")

        lines.append(" ".join(parts))

    return "\n".join(lines)


def hash_ui_signature(elements: list[UIElement]) -> str:
    """Produce a stable hash of the UI state for stall detection.

    Hashes the (resource_id, bounds, text) tuples so that cosmetic
    changes (timestamps, animations) don't count as UI change.
    """
    sig_parts: list[str] = []
    for el in elements:
        x1, y1, x2, y2 = el.bounds
        sig_parts.append(f"{el.resource_id}|{x1},{y1},{x2},{y2}|{el.text}")
    raw = "\n".join(sig_parts)
    return hashlib.sha256(raw.encode()).hexdigest()[:16]


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _parse_bounds(bounds_str: str) -> tuple[int, int, int, int]:
    """Parse ``[x1,y1][x2,y2]`` into ints.  Returns zeros on parse failure."""
    try:
        part1, part2 = bounds_str.strip("[]").split("][")
        x1, y1 = part1.split(",")
        x2, y2 = part2.split(",")
        return int(x1), int(y1), int(x2), int(y2)
    except (ValueError, IndexError):
        return 0, 0, 0, 0


def _should_skip_element(
    class_name: str,
    pkg: str,
    text: str,
    content_desc: str,
    resource_id: str,
    attrs: dict,
) -> bool:
    """Return True if this element should be excluded from the parsed list."""

    # Never skip always-keep classes
    if class_name in _ALWAYS_KEEP_CLASSES:
        return False

    # Skip purely structural containers that have no text / content-desc / id
    if class_name in _STRUCTURAL_CLASSES:
        if not text and not content_desc and not resource_id:
            return True

    # Skip hidden / zero-area elements
    bounds_str = attrs.get("bounds", "[0,0][0,0]")
    try:
        x1, y1, x2, y2 = _parse_bounds(bounds_str)
    except Exception:
        return True
    if x2 <= x1 or y2 <= y1:
        return True

    # Invisible to user (Android sets this on off-screen list children)
    if attrs.get("visible-to-user", "true") == "false":
        return True

    # Skip system-bar packages
    if any(pkg.startswith(prefix) for prefix in _HIDDEN_PACKAGE_PREFIXES):
        return True

    return False


def _short_class(full_class: str) -> str:
    """Return the simple class name from a fully-qualified Android class."""
    return full_class.rsplit(".", 1)[-1] if "." in full_class else full_class


def _short_pkg(pkg: str) -> str:
    """Return a short display form of a package name."""
    parts = pkg.split(".")
    if len(parts) <= 2:
        return pkg
    return ".".join(parts[-2:])
