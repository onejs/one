---
name: ios-simulator-skill
version: 1.3.0
description: 21 production-ready scripts for iOS app testing, building, and automation. Provides semantic UI navigation, build automation, accessibility testing, and simulator lifecycle management. Optimized for AI agents with minimal token output.
---

# iOS Simulator Skill

Build, test, and automate iOS applications using accessibility-driven navigation and structured data instead of pixel coordinates.

## Quick Start

```bash
# 1. Check environment
bash scripts/sim_health_check.sh

# 2. Launch app
python scripts/app_launcher.py --launch com.example.app

# 3. Map screen to see elements
python scripts/screen_mapper.py

# 4. Tap button
python scripts/navigator.py --find-text "Login" --tap

# 5. Enter text
python scripts/navigator.py --find-type TextField --enter-text "user@example.com"
```

All scripts support `--help` for detailed options and `--json` for machine-readable output.

## 21 Production Scripts

### Build & Development (2 scripts)

1. **build_and_test.py** - Build Xcode projects, run tests, parse results with progressive disclosure
   - Build with live result streaming
   - Parse errors and warnings from xcresult bundles
   - Retrieve detailed build logs on demand
   - Options: `--project`, `--scheme`, `--clean`, `--test`, `--verbose`, `--json`

2. **log_monitor.py** - Real-time log monitoring with intelligent filtering
   - Stream logs or capture by duration
   - Filter by severity (error/warning/info/debug)
   - Deduplicate repeated messages
   - Options: `--app`, `--severity`, `--follow`, `--duration`, `--output`, `--json`

### Navigation & Interaction (5 scripts)

3. **screen_mapper.py** - Analyze current screen and list interactive elements
   - Element type breakdown
   - Interactive button list
   - Text field status
   - Options: `--verbose`, `--hints`, `--json`

4. **navigator.py** - Find and interact with elements semantically
   - Find by text (fuzzy matching)
   - Find by element type
   - Find by accessibility ID
   - Enter text or tap elements
   - Options: `--find-text`, `--find-type`, `--find-id`, `--tap`, `--enter-text`, `--json`

5. **gesture.py** - Perform swipes, scrolls, pinches, and complex gestures
   - Directional swipes (up/down/left/right)
   - Multi-swipe scrolling
   - Pinch zoom
   - Long press
   - Pull to refresh
   - Options: `--swipe`, `--scroll`, `--pinch`, `--long-press`, `--refresh`, `--json`

6. **keyboard.py** - Text input and hardware button control
   - Type text (fast or slow)
   - Special keys (return, delete, tab, space, arrows)
   - Hardware buttons (home, lock, volume, screenshot)
   - Key combinations
   - Options: `--type`, `--key`, `--button`, `--slow`, `--clear`, `--dismiss`, `--json`

7. **app_launcher.py** - App lifecycle management
   - Launch apps by bundle ID
   - Terminate apps
   - Install/uninstall from .app bundles
   - Deep link navigation
   - List installed apps
   - Check app state
   - Options: `--launch`, `--terminate`, `--install`, `--uninstall`, `--open-url`, `--list`, `--state`, `--json`

### Testing & Analysis (5 scripts)

8. **accessibility_audit.py** - Check WCAG compliance on current screen
   - Critical issues (missing labels, empty buttons, no alt text)
   - Warnings (missing hints, small touch targets)
   - Info (missing IDs, deep nesting)
   - Options: `--verbose`, `--output`, `--json`

9. **visual_diff.py** - Compare two screenshots for visual changes
   - Pixel-by-pixel comparison
   - Threshold-based pass/fail
   - Generate diff images
   - Options: `--threshold`, `--output`, `--details`, `--json`

10. **test_recorder.py** - Automatically document test execution
    - Capture screenshots and accessibility trees per step
    - Generate markdown reports with timing data
    - Options: `--test-name`, `--output`, `--verbose`, `--json`

11. **app_state_capture.py** - Create comprehensive debugging snapshots
    - Screenshot, UI hierarchy, app logs, device info
    - Markdown summary for bug reports
    - Options: `--app-bundle-id`, `--output`, `--log-lines`, `--json`

12. **sim_health_check.sh** - Verify environment is properly configured
    - Check macOS, Xcode, simctl, IDB, Python
    - List available and booted simulators
    - Verify Python packages (Pillow)

### Advanced Testing & Permissions (4 scripts)

13. **clipboard.py** - Manage simulator clipboard for paste testing
    - Copy text to clipboard
    - Test paste flows without manual entry
    - Options: `--copy`, `--test-name`, `--expected`, `--json`

14. **status_bar.py** - Override simulator status bar appearance
    - Presets: clean (9:41, 100% battery), testing (11:11, 50%), low-battery (20%), airplane (offline)
    - Custom time, network, battery, WiFi settings
    - Options: `--preset`, `--time`, `--data-network`, `--battery-level`, `--clear`, `--json`

15. **push_notification.py** - Send simulated push notifications
    - Simple mode (title + body + badge)
    - Custom JSON payloads
    - Test notification handling and deep links
    - Options: `--bundle-id`, `--title`, `--body`, `--badge`, `--payload`, `--json`

16. **privacy_manager.py** - Grant, revoke, and reset app permissions
    - 13 supported services (camera, microphone, location, contacts, photos, calendar, health, etc.)
    - Batch operations (comma-separated services)
    - Audit trail with test scenario tracking
    - Options: `--bundle-id`, `--grant`, `--revoke`, `--reset`, `--list`, `--json`

### Device Lifecycle Management (5 scripts)

17. **simctl_boot.py** - Boot simulators with optional readiness verification
    - Boot by UDID or device name
    - Wait for device ready with timeout
    - Batch boot operations (--all, --type)
    - Performance timing
    - Options: `--udid`, `--name`, `--wait-ready`, `--timeout`, `--all`, `--type`, `--json`

18. **simctl_shutdown.py** - Gracefully shutdown simulators
    - Shutdown by UDID or device name
    - Optional verification of shutdown completion
    - Batch shutdown operations
    - Options: `--udid`, `--name`, `--verify`, `--timeout`, `--all`, `--type`, `--json`

19. **simctl_create.py** - Create simulators dynamically
    - Create by device type and iOS version
    - List available device types and runtimes
    - Custom device naming
    - Returns UDID for CI/CD integration
    - Options: `--device`, `--runtime`, `--name`, `--list-devices`, `--list-runtimes`, `--json`

20. **simctl_delete.py** - Permanently delete simulators
    - Delete by UDID or device name
    - Safety confirmation by default (skip with --yes)
    - Batch delete operations
    - Smart deletion (--old N to keep N per device type)
    - Options: `--udid`, `--name`, `--yes`, `--all`, `--type`, `--old`, `--json`

21. **simctl_erase.py** - Factory reset simulators without deletion
    - Preserve device UUID (faster than delete+create)
    - Erase all, by type, or booted simulators
    - Optional verification
    - Options: `--udid`, `--name`, `--verify`, `--timeout`, `--all`, `--type`, `--booted`, `--json`

## Common Patterns

**Auto-UDID Detection**: Most scripts auto-detect the booted simulator if --udid is not provided.

**Device Name Resolution**: Use device names (e.g., "iPhone 16 Pro") instead of UDIDs - scripts resolve automatically.

**Batch Operations**: Many scripts support `--all` for all simulators or `--type iPhone` for device type filtering.

**Output Formats**: Default is concise human-readable output. Use `--json` for machine-readable output in CI/CD.

**Help**: All scripts support `--help` for detailed options and examples.

## Typical Workflow

1. Verify environment: `bash scripts/sim_health_check.sh`
2. Launch app: `python scripts/app_launcher.py --launch com.example.app`
3. Analyze screen: `python scripts/screen_mapper.py`
4. Interact: `python scripts/navigator.py --find-text "Button" --tap`
5. Verify: `python scripts/accessibility_audit.py`
6. Debug if needed: `python scripts/app_state_capture.py --app-bundle-id com.example.app`

## Requirements

- macOS 12+
- Xcode Command Line Tools
- Python 3
- IDB (optional, for interactive features)

## Documentation

- **SKILL.md** (this file) - Script reference and quick start
- **README.md** - Installation and examples
- **CLAUDE.md** - Architecture and implementation details
- **references/** - Deep documentation on specific topics
- **examples/** - Complete automation workflows

## Key Design Principles

**Semantic Navigation**: Find elements by meaning (text, type, ID) not pixel coordinates. Survives UI changes.

**Token Efficiency**: Concise default output (3-5 lines) with optional verbose and JSON modes for detailed results.

**Accessibility-First**: Built on standard accessibility APIs for reliability and compatibility.

**Zero Configuration**: Works immediately on any macOS with Xcode. No setup required.

**Structured Data**: Scripts output JSON or formatted text, not raw logs. Easy to parse and integrate.

**Auto-Learning**: Build system remembers your device preference. Configuration stored per-project.

---

Use these scripts directly or let Claude Code invoke them automatically when your request matches the skill description.
