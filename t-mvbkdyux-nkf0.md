---
id: t-mvbkdyux-nkf0
title: Review One PR933 fixture-owned Metro cache before merge
status: done
owner_status:
  state: needs
  text: PR933 8635bf3 review PASS by s47773; parent s43018 normal merge after CI p91951 required checks
  updated_at: 1792191544368
assignees:
- s47773
labels:
- lane:one-native-peach
priority: 3
parent_id: t-mvbk4naq-1xvp0
backend: git
created_at: 1792191234489
updated_at: 1792191556168
field_marks:
  active_form: 1792191234489
  assigned:s47773: 1792191281532
  body: 1792191544368
  claim: 1792191234489
  evidence_summary: 1792191234489
  owner_status: 1792191544368
  parent: 1792191234489
  priority: 1792191234489
  recovery_ref: 1792191234489
  status: 1792191556168
  title: 1792191234489
  unassigned:s43018: 1792191281532
---
Assigned differentlarge Opus high exactsource8635bf3f014559397b79fcef755cff0f3ac09d88 PR933 authorSol s47766. Only existing Expo integration fixtureconfig uses supported cacheStores callback/FileStore rooted in ownmkdtemp/.metro-cache, reset/assertions/timeouts unchanged. Fullsource review and failure-capable actualreset/control: defaultbaseline sandbox foreignsentinel deleted, fixed fixture preserves concurrentforeignstore, cachewithinfixture reused/reset while independentfixtures isolated. Actualassertions development/dotenvupdate/privateenv/production retained. Original CIENOTEMPTY race inferred, not locallyreproduced. No sourceedits/dispatch/nativebuild/newtests/reviewchain. RequiredOne large review before normalmerge, CI p91951 natural requiredTests/artifactdelivery and PR927hold.

PR933 review (Opus high, assigned large reviewer) of exact source 8635bf3f014559397b79fcef755cff0f3ac09d88: PASS. No source findings, no simplification owed.

Source read: diff touches only the generated fixture metro.config.cjs in packages/vite-plugin-metro/src/transformer/expoVirtualEnv.integration.test.ts. Reset flag, dotenv update, private-env, production assertions and both 180s timeouts unchanged. No production, serialization or retry change.

RAN (metro-config/metro-cache 0.87.1 installed in primary): loadMetroConfigFromDisk awaits the exported promise and mergeConfig calls a function cacheStores with MetroCache, so the callback receives FileStore. `...config` is required (the exported object is the whole config), and the resolved fixed config keeps withOne's babelTransformerPath, resolveRequest, sourceExts and projectRoot identical to the original. Resolved cacheStores is one FileStore instance.

RAN: FileStore.clear only rmSyncs the 256 hex subdirs 00..ff under its root, which matches the CI ENOTEMPTY on /tmp/metro-cache/81. A root-level sentinel is never at risk, so a sentinel control must sit inside a hex dir.

TESTED (sandboxed TMPDIR, the real /tmp/metro-cache was never touched): actual metro build --reset-cache, sentinel at <sandbox>/metro-cache/81.
- No writer: original config deleted the sentinel; fixed config preserved it and wrote 6 entries to fixture/.metro-cache.
- Concurrent writer filling every hex dir: original config FAILED with "ENOTEMPTY, Directory not empty: <sandbox>/metro-cache/0a|05|0c" in 3/3 runs; fixed config built ok in 3/3 with the sentinel preserved. This upgrades the author's INFERRED cause: the exact CI failure class now reproduces deterministically against the shared default root and disappears with the fixture-owned root.
- The actual PR test file (only workspaceRoot pinned to /Users/n8/one, diff shown) under vitest 4.1.11 with the writer running: 1 passed, 11.5s; the sentinel survived; no tmp-expo-env-* left after afterAll, so the existing mkdtemp teardown removes the owned .metro-cache.
Falsifier: an ENOTEMPTY or sentinel loss with the fixed config under the writer. Not observed in 4 fixed runs.

Nearby: no other test in the repo passes --reset-cache or resetCache: true.
PR state at review: mergeable, checks SUCCESS, tests and Android compile pending (CI p91951 owns them). Merge handled by parent s43018.
Cleanup: temporary probe scripts only in my session scratchpad; all fixtures and sandboxes removed; no source edits, builds, servers, watchers or worktrees.
