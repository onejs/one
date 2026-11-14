---
id: t-mva2i9vf-z670
title: Repair reported HMR restore and zero-client edit failures
status: done
owner_status:
  state: landed
  text: existing main fixes validated; 116/116 HMR tests pass on 84955bd21
  updated_at: 1792119990576
assignees:
- m36179
labels:
- lane:metro-to-one
backend: git
created_at: 1792100736123
updated_at: 1792119990576
field_marks:
  active_form: 1792100736123
  assigned:m36179: 1792119420979
  body: 1792119990576
  claim: 1792100736123
  evidence_summary: 1792100736123
  owner_status: 1792119990576
  parent: 1792100736123
  priority: 1792100736123
  recovery_ref: 1792100736123
  status: 1792119990576
  title: 1792100736123
  unassigned:m34592: 1792119420979
---
RELAYED RAN ci-manager p88682: One Checks and Tests38810260659 at merged83e15b21f4e34dd1a4d466e220ee7c7605854ae5 has tests red/checks green. src/utils/createNativeDevEngine.test.ts immediate follow-up HMR restore/getSourceMap expected component-v1 but received hmr-session-ready; zero-client edit recoverability next bundle lacks component-v2. Causality not yet established. Retained original log /tmp/ci-router-one-38810260659-failed.log on router host, not this host; no duplicate fetch. Reproduce owning suite, fix actual mechanism preserving assertions/timeouts, reviewed branch PR only. No stable publication, One direct main push, retries or skipped cases.

RAN macOS current merged83e15b21 owning suite: 115passed/1failed. Both originally reported immediate-restore and zero-client cases pass; route deletion through symlinked node_modules instead reports hmr:error from stale registry import of removed [id].tsx. Thus macOS does not reproduce original CI failures and no interop causality established. Original workflow is ubuntu-latest, so exact owning suite is dispatched on Linux with unchanged assertions and focused vxrn dependency build. Source branch tm/hmr-recoverability at83e15b21; no source edits yet.

RAN Linux beast source83e15b21 unchanged owning suite116/116 pass, including immediate restore/getSourceMap and zero-client edit cases. Focused vxrn dependency build succeeds; source/tests/assertions unchanged. Receipt w-55b006, delivery /Users/n8/.worktrees/one-hmr-recoverability/.remote-deliveries/1792101533-12415/linux-hmr-suite.log, suite exit0. This does not classify original CI assertion failures as flake or prove a repair. macOS115/116 separate route-delete race remains observed. Mirror ancestry provisioned and verified on both Linux builders under existing mirror locks after dispatcher selected a second cold builder; limits unchanged. Investigating retained original CI excerpt and watcher sequencing before any source change.

RAN full vxrn Linux package command matches CI working directory: 331/332 pass; owning createNativeDevEngine116 all pass again. Sole failure is builder Ruby ENOENT in unrelated Expo CocoaPods patch probe, filed separately as tm-defect. Read retained original router log on pro-128 without refetch: zero-client rebuilt bundle includes actual component-v1 body, so this is stale source rather than an empty/truncated compiled module. Immediate restore had two updates but retained hmr-session-ready. INFERRED possible watcher/build-completion ordering lead: Rolldown wait_for_ongoing_bundle awaits the running task future, while BundleCompleted separately updates watched paths; no deterministic causal proof yet. No repeated unchanged runs, assertion relaxations, CI retry or source patch. Original CI failure remains open/unclassified while parent continues reproducible upstream motion blocker.

RAN successor adopted managed one-hmr-recoverability and fast-forwarded clean owned branch83e15 to origin/main84955bd21. Existing main bcc94a382 already changes only three watcher edits to atomic temp-write/rename, assertions/timeouts retained. RELAYED RAN its commit body: forced400ms truncate/write gap reproduces both exact CI messages; delayed rename countercontrol passes2/2. Existing route deletion repairs cc9359e3a/1423a1b01/cf7081b1f address separate macOS failure. Original stale watcher hypothesis superseded by author reproduction; no new runtime repair/review requested. Focused owning suite on current source is next, rather than duplicate implementation or CI watching.

RAN w-9507cd never started owning tests: bunx --no-install resolved /private/var/.../bunx-501-vitest@latest and failed missing picomatch. This is test-runner/dependency setup, not source-suite failure. Restoring exact frozen lock in adopted worktree and invoking installed pinned Vitest directly next. No runtime/assertion change or identical test rerun without premise change.

RAN: frozen install succeeded on 84955bd21019783c1286daefb78cb925dec06c37. Installed Vitest 4.1.11 starts, but suite collects no tests because @vxrn/compiler/worklet-utils dist export is absent. Building vxrn dependency chain with skip-types before running unchanged owning suite; no runtime failure established.

RAN: w-071052 built 15 required workspace packages successfully, then installed Vitest 4.1.11 ran createNativeDevEngine.test.ts unchanged: 116 passed, 0 failed, 3.49s on 84955bd21019783c1286daefb78cb925dec06c37. RELAYED causal repair is existing bcc94a3821090c7c100e85fd81bc82a7a826619c atomic editor-save fixture change plus existing route-deletion runtime repairs through cf7081b1f. No duplicate source patch authored. CI/canary delivery remains with ci-manager canonical follow-up t-mva0r6x5-c3n0.
