---
id: t-mvdanwg2-yc20
title: Review the One native bundler bug batch
status: done
owner_status:
  state: landed
  text: 'independent review complete for #962/#963/#964; APPROVED verdict COMMENT reviews posted; GitHub formal approval blocked shared-author account; lead p94655 owns landing, ci-manager owns CI'
  updated_at: 1792300145423
assignees:
- p94807
labels:
- lane:native-bug-review
- umbrella:metro-to-one
backend: git
created_at: 1792295834114
updated_at: 1792300211795
field_marks:
  active_form: 1792295834114
  body: 1792300211795
  claim: 1792295834114
  evidence_summary: 1792295834114
  owner_status: 1792300145423
  parent: 1792295834114
  priority: 1792295834114
  recovery_ref: 1792295834114
  status: 1792300145423
  title: 1792295834114
---
Owner direction, 2026-10-17: "Review PRs onejs/one#962 ... and onejs/one#963 ... a third PR from helper p94747 ... review it too". Read-only review; reproduce new regression probes on main and branch, full owning test files, Metro parity, codegen types, keepNames/minifier scope, simplification and nearby code check. No code pushes, merges, or agents. CI owner ci-manager. Lead p94655. GitHub review plus final verdict to lead.

RAN: gh pr diff and full source paths for #962 (5a00bae6b2) and #963 (6ac9e572a5). RAN Metro installed module wrapper/import-export transform: duplicate UnsupportedFeature/read names preserved; default Metro minifier mangles to s/empty. Ordinary Flow module with Worklets plugin and RN Babel preset transforms. Typed worklet serialization itself is unsupported by this installed upstream plugin; avoid claiming that exact fixture is Metro parity. INFERRED: codegen original-types bypass is needed for earlier compiler callers; native pipeline already orders codegen then Flow then compiler. Shared isReactNativeCodegenSpec reuses existing gate; shared getNativeOutputOptions covers dev and build. Evidence saved outside worktree at /tmp/one-native-review-p94807. Build wait w-51173c remains exact dependency. Third PR expected from p94747.

Review scope now includes #964 b72a68c156343a31ec5eeca5b8934efc96124cc6 from p94747. RAN gh pr diff; source lowers unshadowed member references to module.exports/exports in modules with imports/exports through Babel CommonJS and TS plugins, after compiler and Flow stages. Need probe actual Metro worker import/export path rather than trusting RN Babel preset as exhaustive Metro oracle.

TESTED #964 actual helper (loaded from git head through Babel TS erasure into a virtual module without source edits): top-level this exported through module.exports becomes undefined and strict-mode probe true, Metro RN preset produces object/false. Detection skips Object.assign(exports,{attached:value}) and const out=exports, despite top-level ESM; both work under Metro RN preset. Evidence mixed-helper-probe.log and mixed-options-oracle.log. p94747 and lead p94655 notified once of blockers. Full owning tests remain pending build admission.

Lead p94655 direction, 2026-10-17: "owner direction forbids Babel in One native path ... treat runtime Babel as a blocking finding and review the corrected head when p94747 pushes it. #962 and #963 are unchanged." Applies to #964 runtime path. Original owner quote is recorded in Contrast plans/contrast/metro-to-one.md and was read this session. Corrected head required before approval.

RAN: prerequisite turbo vxrn dependency build passed (15/15 cached). Next single admitted batch performs main baseline with exact new tests in disposable sibling files, restores clean tree, full compiler and codegen tests for #962 plus typed-spec/codegen/reentry probe, then frozen install/dependency build/full engine tests for #963. Previous immediate admission refused behind p94864; no test ran. No source changes or branch pushes.

TESTED main f89cf978ec negative controls: both #962 new tests fail with Flow is not supported; #963 new names test fails with read$1. Exact logs 962-main.log and 963-main.log. Batch stopped before PR suites because ephemeral origin/review-962 ref vanished; commits remain available, resuming by full pinned SHA without repeating controls. Worktree clean.

Independent review verdict: APPROVED at 5a00bae6b2d1f6f6c74f4901e6a46277c1e242c8.

TESTED: both new regression cases fail on main f89cf978ec with `Flow is not supported`. On this head, the full compiler suite passes 113/113 and the native codegen file passes 13/13. Frozen install and the requested vxrn dependency build succeeded.

TESTED: an additional pipeline probe leaves a Flow native component spec byte-identical through the early worklets call, generates its typed `color` prop into the native view config, then strips the surviving Flow on worklets reentry. This supports preserving types until codegen. The installed Metro React Native preset accepts ordinary published Flow source with the Worklets plugin; its typed worklet serializer has a separate limitation, so I do not claim that exact typed-worklet fixture passes upstream.

Source review: the shared codegen predicate retains the existing filename/call gate; generated output does not match the surviving-call check. Maps compose in output-to-input order. Nearby native code already orders codegen before Flow before worklets. No blocking defects or additional DRY merge are owed; this reuses the existing Flow strip and codegen gate.

GitHub rejected formal approval because this session uses the PR author account. This comment records the independent review verdict and executed validation.
Independent review verdict: APPROVED at 6ac9e572a51bb76937007d1b7bf0cbcc3072a866.

TESTED: the new duplicate-name regression fails on main f89cf978ec with `read$1`; the full owning createNativeDevEngine test file passes 121/121 on this head. Frozen install and the requested vxrn dependency build succeeded.

TESTED: the installed Metro module wrapper preserves colliding class/function names, while its default minifier changes the names. This agrees with enabling keepNames only when minify is false. The new regression executes both development and unminified production bundles.

Source review: the shared output options also cover the live development engine, and minified output keeps its previous behavior. No blocking defects or additional simplification/DRY merge are owed; the option belongs in this existing shared helper.

GitHub rejected formal approval because this session uses the PR author account. This comment records the independent review verdict and executed validation.

TESTED corrected #964 c87781fe1b still diverges from Metro in three small probes: captured synthetic exports under parameter shadow, ForOf binding assignment not publishing latest value, TS enum export remains read-only. Actual helper vs RN preset outputs captured in mixed-corrected-probe.log. Author and lead notified with exact repros. Runtime helper is now Babel-free; old added Babel dependencies remain unused. Required corrected-head main control and full owning suite queued with one exact watcher.

TESTED #964 c87781fe1b main controls fail module undefined (dev/prod); full file154/154 passes but three independent probes showed real Metro divergences. New head a8a18d5d7c read in diff: capture wrapper exports outside source shadows, publish loop binding each iteration, lower runtime TS before export edit, compose TS maps, remove added Babel deps. TESTED all three exact repros now match Metro via source helper; final full owning166-test suite queued without repeating main controls. Evidence mixed-final-probe.log.

Independent review verdict: APPROVED at a8a18d5d7cf2a89857ab7f2e0393eae292675e09.

TESTED: main f89cf978ec fails the new development and production replacement-export regressions with `ReferenceError: module is not defined`. The final head's frozen install, requested vxrn dependency build, and full owning native-engine file passed 166/166.

TESTED: my three additional Metro comparisons exposed real defects at c87781fe1b: exported mutations captured a local `exports` parameter, for-of updates left the published value stale, and TypeScript enum exports remained getter-only. All three exact probes now match the installed Metro React Native preset. The added suite also covers the original top-level-this/strict-mode and bare wrapper-reference findings, writable aliases, scope shadows, for-in updates, runtime TypeScript declarations and original-source maps.

Source review: the shared plugin runs after Flow/compiler transforms and before bundler classification for development and production. The helper uses Oxc/MagicString/SWC and the unused added Babel dependencies were removed. TypeScript, edit, and CommonJS maps compose in output-to-input order. Existing pure CommonJS and lexically shadowed sources stay outside the transform.

No blocking defects remain in the requested scope. One nonblocking simplification is owed: `analyze.bind` and `lowerLocalExports.names` walk the same binding patterns; use one collector returning identifier nodes rather than maintaining both copies. The worklets scope file has another pattern collector, but its lifecycle is specialized; a repo-wide refactor is not needed for this fix.

GitHub previously rejected formal approvals because this session uses the PR author account. This comment records the independent verdict and executed validation.

Latest steering extends #963 review to43130e95b8: esbuild async lowering can rename lowered inner class constructors before Rolldown. Source read all callers: native plugin default minify=false means dev keepNames=true; build passes chosen minify; Metro worker passes !options.minify. Queued focused new regression on main with rebuilt compiler, full native engine122 and Metro worker49, plus unminified production class+async probe. Flagged stale tracked vxrn types hermesCompatSWCPlugin declaration (new optional arg absent) to lead; runtime source interface callers and compiler declaration match.

RAN #963 amendment diff 43130e95b8 -> c840929610: declaration-only change adds keepNames?:boolean to tracked vxrn hermesCompatSWCPlugin signature; runtime source unchanged. Existing exact runtime watcher w-1d9f69 validates43130e95b8 and remains applicable to this declaration-only head. No repeated runtime checks needed.

Independent review verdict: APPROVED at c840929610f376b2428225fe704ec8042c4848b0.

TESTED: the new live-development class-plus-async regression fails on main f89cf978ec with both observed names `UnsupportedFeature2`. After the correction, the full native engine file passes 122/122 and the full Metro worker file passes 49/49. An additional unminified production bundle executes the same class-plus-async pattern and preserves both the constructor and instance constructor names as `UnsupportedFeature`. Frozen install and the requested vxrn dependency builds succeeded.

Runtime validation used 43130e95b8. I verified c840929610 changes only the generated vxrn declaration to include the new optional keepNames argument; runtime validation therefore applies unchanged.

Source review: unminified development, production, and Metro worker paths pass keepNames through the earlier esbuild async lowering as well as Rolldown output. Minified paths keep their existing behavior. Both transformHermesAsync callers and the affected declarations were checked. This resolves the earlier rename that output-only keepNames could not recover.

No blocking defects or additional DRY merge are owed in this correction. The options remain in the shared plugin/output paths. A future options object could improve the long positional helper calls, but is unnecessary for this scoped fix.

GitHub rejected prior formal approvals because this session uses the PR author account. This comment records the independent verdict and executed validation.

Cleanup: worktree clean at remote PR #963 c840929610. tm worktree remove from primary reported kept only by own session processes, automatic release at p94807 exit. No foreign holder, owned service or active wait. Evidence and final handoff retained /tmp/one-native-review-p94807, lead p94655 owns landing and CI handoff. Owner closeout shared with tm share.
