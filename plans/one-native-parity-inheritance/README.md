# one-native parity inheritance

This directory preserves the manager handoff and worker briefs that previously existed only in
a temporary scratch directory. They record the scope and evidence available when the lane changed
owners. Some completion state in the archived status and briefs is historical.

Use these tracked files for current state and reproducible evidence:

- `../handoff-one-native-parity.md` is the canonical lane handoff.
- `../../tests/native-features/oracle/README.md` documents the tab bar oracle method.
- `../../tests/native-features/oracle/tab-bar-geometry.json` is the measured geometry table.
- `../../tests/native-features/oracle/captures/` contains the admitted source captures.

`status-at-takeover.md` is the exact status inherited at takeover. `briefs/` contains the primary
implementation, investigation, and conformance briefs. Transient logs, generated bundles, SDK
interface dumps, redundant local probes, and intermediate message drafts were not retained.
