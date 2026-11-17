---
id: t-mvbh9t46-rd0
title: Review One PR931 native app export before normal merge
status: done
owner_status:
  state: needs
  text: s47663 Opus high assigned exact PR931 source275e3008a review before One merge; readonly source/failure-capable packaging probe; CI p90480 naturaldelivery
  updated_at: 1792186045799
assignees:
- s47663
labels:
- lane:one-native-peach
priority: 3
parent_id: t-mvbh2sdi-1q380
backend: git
created_at: 1792186001574
updated_at: 1792186173573
field_marks:
  active_form: 1792186001574
  assigned:s47663: 1792186045799
  body: 1792186161874
  claim: 1792186001574
  evidence_summary: 1792186001574
  owner_status: 1792186045799
  parent: 1792186001574
  priority: 1792186001574
  recovery_ref: 1792186001574
  status: 1792186173573
  title: 1792186001574
  unassigned:s43018: 1792186045799
---
Assigned differentlarge Opus high review of Sol s47617 source275e3008a on PR931, workflow-only app archive after same-run restore. Nate original approved Opus high native lead/review seat, no new implementation allocation. Review entire diff, actual source/cache/archive identity and preservation of symlinks/executable mode; run failure-capable probe for missingapp/mismatchedcache/nonexecutable and alteredidentity. No nativebuild/dispatch/producer, no source edits or extra reviewchain. One review required before merge, distinct from advisory Contrast. CI p90480 natural matching-source export; PR927 remains held. Return once concrete verdict/simplifications/limits and finish no CIwait.

# PR931 review (t-mvbh9t46-rd0) — Opus high, different large model than author s47617

Verdict: PASS for source 275e3008ad3017ce8e463a307d8837ac52231021 (PR head matches). No source defect. Parent may do normal reviewed merge.

Scope read: full diff (.github/workflows/test-native-ios.yml +51), producer generated-swiftui save step, native-features-ios restore/archive/upload order, existing diagnostics upload (does not include the app, so no duplicate).

RAN independent probe (scratchpad probe/run.py, not the author's): extracts the exact embedded Python from the PR workflow, builds a representative .app (binary Info.plist, exe mode 0751, framework Versions/Current + top-level symlinks, an xattr), round-trips it through bsdtar+zstd like actions/cache on macOS, runs the script with GitHub env, extracts the artifact.
- PASS: exit 0; receipt archiveSHA256 equals uploaded bytes; sourceRevision/cacheKey/runAttempt/runURL bound; archive rooted at NativeFeatureTests.app only (11 entries, no AppleDouble); mode 0751 kept; both symlinks kept as links; extracted exe/plist hashes match receipt; xattr survives; no token-shaped strings; tampered archive fails receipt hash.
- Failure controls all exit nonzero with no artifact files: missing app, wrong matched key, empty matched key, non-executable (0644), CFBundleExecutable absent.
- Probe can fail (TESTED by mutation): tar -h (follow symlinks) -> symlink check breaks; dropping X_OK -> non-exec case FAIL; dropping key assert -> both key cases FAIL.

Order/condition: archive and upload run with default success() right after fail-on-cache-miss restore, before ios-ui-test-setup. if-no-files-found: error. compression-level 0 fine for tar.gz. No secrets: workflow uses none; receipt holds only public run/repo/sha/hash fields.

INFERRED source binding: cache key is run_id-scoped, saved only by generated-swiftui in the same run, both jobs check out the same github.sha, so receipt sourceRevision (consumer checkout) equals the producer's source. Would differ only if another workflow saved that key.

Optional simplifications, non-blocking:
1. Replace shasum subprocess with hashlib.sha256 (already in python, no extra process).
2. The matched==primary key assert cannot fire with an exact key, fail-on-cache-miss and no restore-keys; keep cacheKey in the receipt, the assert is redundant.
3. Cache key and app path literals now repeat in save, restore, archive env and the Python path; could hoist to job env.

Limits: synthetic bundle only; no native build, dispatch, app/native correctness, artifact size or retention cost measured; historical 84955 cache not claimed; PR927 native hold unchanged; CI p90480 owns natural artifact delivery. Rerun artifact-name behavior matches the existing diagnostics upload pattern, not separately tested.

Cleanup: read-only; no edits, commits, servers, sims, watchers, claims or tree owned. Primary checkout untouched on main.
