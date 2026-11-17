---
id: t-mvkne03n-209n0
title: Validate and complete the One macOS native host used by Team Machine
status: done
owner_status:
  state: landed
  text: host fixes pushed for lead integration review; cache released to networking/consumer, shared tree retained
  updated_at: 1792742748740
labels:
- lane:one-macos-host
- umbrella:one-macos-native
priority: 3
parent_id: t-mvknc99k-k8t0
backend: git
sessions:
- s69243
commits:
- 55bb498131e87dc2e9aa0e4f0e88e9578e33b1b2
- 724ae020dad0130178aa14e8843102f729b6607c
- d10d8ab682986fe09bd60c8ac55be3ecf0e2694e
created_at: 1792740470531
updated_at: 1792742928879
field_marks:
  active_form: 1792740470531
  body: 1792742748740
  claim: 1792742928879
  claim_current:923c0da3e64fa195ab4b1abf8e80057a: 1792742928879
  claim_state:3a1d627eac3529fc2c4b91da6a6549cb:1792740620811:=s69243:=mc-3aa87nk0z4j17:1792740620811:f: 1792740620811
  claim_state:923c0da3e64fa195ab4b1abf8e80057a:1792742928879:~:~:~:o:ca2ef309e0fbf9622dff11848c817435: 1792742928879
  ? claim_state:ca2ef309e0fbf9622dff11848c817435:1792740651827:=s69243:=mc-3aa87nk0z4j17:1792740651827:o:3a1d627eac3529fc2c4b91da6a6549cb
  : 1792740651827
  commit_linked:55bb498131e87dc2e9aa0e4f0e88e9578e33b1b2: 1792742748544
  commit_linked:724ae020dad0130178aa14e8843102f729b6607c: 1792742271504
  commit_linked:d10d8ab682986fe09bd60c8ac55be3ecf0e2694e: 1792742067790
  evidence_summary: 1792740470531
  owner_status: 1792742748740
  parent: 1792740470531
  priority: 1792740470531
  recovery_ref: 1792740470531
  status: 1792742748740
  title: 1792740470531
---
Bounded native-host slice of the eight-hour owner-authorized continuation. Preserve One tm/one-macos efb7ce9cc9. Prepare a managed source worktree from fresh main and integrate the existing feature branch; abort and report any co-tenant conflict. Validate the real native animated visual update and lifecycle, TextInput/scroll/window dimensions, and fix only observed host defects blocking the shared Team Machine GUI. Consumer is independent and owns gui/. Lead s69213 owns architecture, plan, evidence assessment, integration and delivery; report a concrete host blocker directly to lead, do not ask owner. Public One sources only. CI owner ci-manager. Keep feature on pushed branch for final owner review; no stable release. REVIEW: lead assembles one independent review when the native/app integration unit is ready.

TESTED controls on repaired host: single-line native value host input with submit event; controlled uppercase/maxLength produces ABCDEFGH; multiline native text line one/newline/line two; initial scroll offset60, scrollTo120, wheel210; screenshot dimension label changes900x868 to760x818. TESTED active animation unmount/remount produces intermediate native alpha0.2680/translateX10.207. Reload during active animation crashes queued Scheduler command on freed SchedulerDelegate; retain delegate through JS-thread quit repair is building. Evidence under /Volumes/Samsung-1TB-990/evidence/one-macos-host-s69243 including reload-crash.ips.

TESTED further lifecycle falsifier: first active reload succeeds after retaining SchedulerDelegate, but second reload crashes on main display link in NativeAnimatedNodesManager::onRender because manager destruction posts asynchronous stop. OneMacosAnimated now clears/stores callbacks synchronously under a recursive mutex shared with frame invocation; main-thread link start/stop remains dispatched. Second crash preserved as reload-second-crash.ips. Native target rebuild underway.

TESTED final d10d8ab682: native Debug build passed; three consecutive active-animation reloads stayed in PID46171 and reloaded the real fixture bundle, producing intermediate native alpha/translateX after every reload and final1/120. Original experiment efb7ce9cc9 is an ancestor of merge724ae020da and d10d8ab682; pushed origin/tm/macos-resume, no main merge or publication. No gui/ changes. CI owner ci-manager; lead s69213 owns consumer installation, independent integration review, feature-branch integration and delivery. Source ~/.worktrees/one-macos-resume; core cache /Volumes/Samsung-1TB-990/builders/one-macos-resume; source-bound proof /Volumes/Samsung-1TB-990/evidence/one-macos-host-s69243 with WebP images, native readbacks, both pre-fix crash reports and provenance.json. Historical mobile/web byte gate not rerun; no performance claim. Preserve the source tree until the consumer installs or the lead releases it.

Lead extended this native-controls unit to concrete consumer AXPress blocker after d10d8ab682 push. Investigating native accessibilityPerformPress on minimal fixture without app activation. Native cache remains owned by s69243 until this check completes; networking author s69303 owns only its networking files and OneMacosModules.mm. Shared worktree retained for lead and s69303.

RAN worktree ownership check: s69303 now has uncommitted networking registration and new networking source files in shared tree; those files are untouched by this worker and must remain. Native AX validation/build cache still owned by s69243 until handoff; preserve shared tree for s69213/s69303 rather than removing it.

TESTED AX baseline in inactive own fixture: accessibilityPerformPress returns accepted=true and focusable=true while appActive=false/windowKey=false, but First presses remains0. Same command sequence direct root press changes Second presses1. Thus focusable gate is not this fixture cause. Native NSApp nil-target sendAction cannot reach background view root; proposed repair routes from pressed view with NSResponder.tryToPerform and returns actual result. Builds/proofs include s69303 uncommitted networking sources without editing/staging them.

Native host unit complete. Branch origin/tm/macos-resume; commits 724ae020da (fresh main + efb7ce9cc9), d10d8ab682 (animation/lifetime), 55bb498131 (inactive AX press). No main merge/release; lead owns independent integration review and consumer acceptance. CI owner ci-manager owns normal workflows for pushed tip55bb498131; no CI watcher was started here.

TESTED: real NativeAnimated alpha .2624/.5255 and translateX9.36/48.82 during unchanged React render count, final1/120. Active unmount/remount and three active reloads pass after delegate/frame callback lifetime repairs. TextInput submit, controlled uppercase/maxLength, multiline, initial/command/wheel scroll and resized window dimensions pass. Native accessibility method increments both buttons and one again after reload; nonbutton rejects; appActive/windowKey false; real cursor900,373 unchanged. AX baseline returned success but did nothing; view-origin responder routing repairs it.

Evidence /Volumes/Samsung-1TB-990/evidence/one-macos-host-s69243: provenance.json for d10 runtime; ax-provenance.json for55bb own AX source, binary/archive hashes; ax-native-build.log latest build; final-animation-mid/end.webp, controls.webp, ax-fixed/reloaded.webp; inspect*.json; both pre-fix crash reports. App-owned native bitmap captures; CuaDriver attempted first but window capture hung. AX proof invokes native method inside host, not consumer interprocess AX. No fresh mobile/web byte gate or performance claim. Split-view remains honest slot stub; Reanimated unsupported.

TRANSFER READY: no native build running. Shared source /Users/n8/.worktrees/one-macos-resume retained for live lead s69213/networking s69303. Their networking changes remain uncommitted and untouched; latest native build also compiled those sources. Keep existing node_modules/dist outputs. Warm derivedData /Volumes/Samsung-1TB-990/builders/one-macos-resume; core archive Build/Intermediates.noindex/OneMacosCore/build/libOneMacosCore.a; fixture Build/Products/Debug/MacosBasic.app. Consumer/networking can now reuse this cache, incrementally rebuild target if source changes; do not treat current cache as pure55bb without networking.

Stopped owned fixture24878, server53562(port8097), staleness watcher8295 and its sleep child65114. Built own background launch copy retained at /Users/n8/Library/Caches/one-macos-host-s69243/MacosBasic.app, with LSUIElement=true in copy only, ad hoc signed; source plist unchanged. LaunchServices rejected open -n -g; direct executable with ONE_MACOS_DEBUG_DIR and ONE_MACOS_BUNDLE_URL worked. No shared CuaDriver daemon or user app touched. Lead receives completion through tm finish; no completion mail.
