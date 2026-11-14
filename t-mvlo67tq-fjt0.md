---
id: t-mvlo67tq-fjt0
title: Add exclusive native application server context
status: done
owner_status:
  state: needs
  text: 'lead m53593 combined review and owner approval on draft PR #1029; CI p103700 owns Checks and Tests'
  updated_at: 1792802431493
labels:
- lane:metro-to-one
- umbrella:plans/contrast/metro-to-one.md
backend: git
sessions:
- s72533
commits:
- e221d54ee02083d9a20a7ac05a4f5044760d838e
created_at: 1792802253086
updated_at: 1792814541107
field_marks:
  active_form: 1792802253086
  body: 1792814541107
  claim: 1792802253086
  commit_linked:e221d54ee02083d9a20a7ac05a4f5044760d838e: 1792802401857
  evidence_summary: 1792802253086
  owner_status: 1792802431493
  parent: 1792802253086
  priority: 1792802253086
  recovery_ref: 1792802253086
  status: 1792814541107
  title: 1792802253086
---
Parent Contrast task t-mvlo1kz9-1zmg0, lead m53593, CI p103700. Add explicit native server context activated before guest evaluation and disposed after unmount or evaluation failure. Preserve shared module identity. Validate real native getURL guest A/B, reload, failure, host restoration and overlap refusal. Push PR to main, held for owner review; no publication or downstream overlay.

Goal: supported native guest server URL scope in One, with shared module identity and host restoration. Lead m53593; CI p103700; parent Contrast task t-mvlo1kz9-1zmg0. One task t-mvlo67tq-fjt0.

Pushed source e221d54ee02083d9a20a7ac05a4f5044760d838e, branch tm/metro-native-app-context, draft PR https://github.com/onejs/one/pull/1029 targeting main. Feature held for owner review and lead's combined integration review. No merge, publish, release dispatch, downstream overlay, services or native builds.

API: import { setNativeApplicationContext } from 'one'. Call const cleanup = setNativeApplicationContext({serverURL}) BEFORE synchronous guest CJS evaluation. Native getURL reads the active URL, including top-level initializers. serverURL must be absolute HTTP(S) without query/fragment; trailing slashes removed. Stop/unmount host before activation. Only one context is allowed; overlapping activation throws. Unmount/stop guest before cleanup; on evaluation failure catch and cleanup before throwing. Reload must dispose old work/context and evaluate fresh guest modules. Cleanup is idempotent, and stale cleanup cannot clear a newer guest. No React provider, environment mutation, fetch replacement, module wrapper/alias or dependency edit. Web/server getURL unaffected. Context scopes URL only; parent owns authentication/data-client/schema/router lifecycle and endpoint readiness. In-flight work or constants captured by old modules cannot be retargeted.

TESTED: disposable Bun runtime probe uses real getURL.native.ts and nativeApplicationContext.ts bundled with compile-time host URL and __DEV__ constants. Three scenarios: compiled host, dev-server stub, production default. Each passes guest A/B CJS top-level captures, shared One object identity, reload, evaluation-failure restoration, invalid URLs, overlap refusal, repeated and stale cleanup, and web unaffected. Negative original-getURL control fails on guest A inheriting host URL. This proves the URL seam, not actual installed React/RN registry identity or native acceptance. No automated test added to OSS source.

Evidence: /Volumes/Samsung-1TB-990/one-native-context-evidence/probe.ts plus scenario .log/.js and original source. Rerun: bun /Volumes/Samsung-1TB-990/one-native-context-evidence/probe.ts <checkout-root>. Focused context tsc --noEmit and source oxlint passed. oxfmt passed context/native URL; existing index formatting outside changed exports remains untouched. git diff --check passed. Narrow TypeScript declaration emit produced committed API declarations. Full CI not run locally; Checks and Tests belongs to p103700.

Next integration requires building packages/one JS artifacts using its existing build script (bun run build in packages/one with installed workspace dependencies), then parent-controlled downstream delivery and host bundle refresh so the exact shared 'one' instance exports this API. No native code changed. Parent owns installed guest/auth/reload/Exit proof and recording owner approval in its Contrast plan. Owner direction relayed in assignment: 2026-10-24 "Add native data context", scoped to guest application context, retaining "Use existing Node server".

No further optimization indicated: one optional context lookup per native getURL call; URL parse/normalization only on activation. Worktree clean/published and released through tm worktree remove. No children, owned listeners, builds or live watcher remain. Review/CI/native acceptance transfers to lead and CI owner; task remains needs review rather than falsely done.

Cleanup receipt: tm worktree remove kept the clean published tree solely because own Codex processes 9107, 9169, 11766 hold cwd; CLI releases it on session exit. Owner s72533 until exit, then parent may prune if retained. Final corrected handoff: /Volumes/Samsung-1TB-990/one-native-context-evidence/s72533-handoff.md. No live staleness watcher, listeners or children.

RAN serial publisher s69213 accepted ONE release.yml workflow_dispatch40046608886, exact e221d54ee02083d9a20a7ac05a4f5044760d838e branch tm/metro-native-app-context, URL https://github.com/onejs/one/actions/runs/40046608886 . Prior queued/running release checks empty. CI p103700 owns terminal verdict and exact artifact source/integrity/content; m53593 owns installed native data-context integration with existing Node compiler. Publication/consumer success not inferred, feature main/stable held. No second dispatch/watch. Receipt lead evidence/native-context-canary-run.json.

RAN/TESTED terminal40046608886 SUCCESS: one/vxrn/@vxrn/compiler2.0.0-0.canary.1792802820141 exactsourcee221d54ee02083d9a20a7ac05a4f5044760d838e/SHA512integrities verified. Packed owning source+publicexports/declarations present; four actual packed CJS/ESM/native context module controlsPASS (URL normalize/invalidreject/duplicateactive refusal/cleanup/stalecleanup). Initial nested-replacement probe rejected by intended single-active contract, corrected after source read, no productrepair. CI evidence /tmp/ci-one-e221-context-artifacts/verification.json and packed-runtime-probe.json. Version/source/content receipt sent integrationlead53593; installed hostJS/Nodecompiler-preserving acceptance remains leadowned, PR1029main/stable held.

Owner explicitly approved merge; parent merged One PR1029 normally as e7b51323bf99a82e9638501e290cc13a63236b44 at2026-10-24T04:02:08Z after required checks/tests PASS run40059848465. Installed Contrast proof completed; stable publication separate.
