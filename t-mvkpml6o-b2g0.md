---
id: t-mvkpml6o-b2g0
title: Review native Mac host and networking integration
status: done
assignees:
- s69465
labels:
- lane:one-macos-review
- umbrella:one-macos-native
priority: 3
parent_id: t-mvknc99k-k8t0
backend: git
created_at: 1792744230336
updated_at: 1792749709516
field_marks:
  active_form: 1792744230336
  body: 1792749709516
  claim: 1792744230336
  evidence_summary: 1792744230336
  owner_status: 1792744230336
  parent: 1792744230336
  priority: 1792744230336
  recovery_ref: 1792744230336
  status: 1792749709516
  title: 1792744230336
---
Independent Opus medium review assigned to current consumer integration author s69465 after actual consumer unit, without delaying first data/input proof. Read-only review of One native source after previously accepted ab09/5b602/86324 checkpoint; review source/provenance and focused native probe. BatchA TextInput rewrite and NativeAnimated/animation/lifetime/AX (split into2-4relatedcommits perpacket), BatchB HTTP/Blob/prelude edde76ec84,dad00b60f4,a30893b0ed. Existing baseline failures/runtime proof retained in host/networking evidence; reviewer should run focused behavior that would expose an issue, no fullmatrix/rebuilds or invented gates. Return actionable defects or scoped approval with limits in task/handoff, no sibling mail or source edits. Nativecontrols newauthor s69441 has separate later review coverage to assign after source delivery.

Controls packet now delivered by Sol author: 478f390923 (base a30893b0ed), assigned independent Opus s69465 after first live flow. Read handoff /Volumes/Samsung-1TB-990/evidence/one-macos-controls/handoff.md, actual AppKit event/controlled state/lifecycle proof. New upstream RN idle registration prerequisite is separate task t-mvkqh48w-1lvj0, source pending s69517.

Review verdict (s69465, Opus, source read plus live consumer run on assembly 4cf05bdaff)

Approve packets A and B and 61cda88399 with the defects below; none block the consumer flow.

Live (TESTED, app pid 13294, background AX only): shared ControlRoom rows, session select, transcript fetch, composer TextInput type/edit/readback, per-session draft, Asks via native NSSegmentedControl. No NativeIdleCallbacksCxx LogBox after 61cda88399. 9ce9e088bb aligns title and summary baselines (row-crop-s13 vs row-crop-r1).

Defects (INFERRED from source unless noted):
1. bfec6c9a3a: every JS console line, js error and exception now goes to the unified log as %{public}, in all builds. Any app that logs a token or URL with credentials persists it readable by `log show`. Keep public for Debug only, or private by default.
2. dad00b60f4 OneMacosNetworking didCompleteWithError: blob response type stores and emits partial data even when error is set, including abort. After abort JS ignores the event, so no BlobCollector ever wraps it and the bytes stay in the store for the runtime's life. Store only when !error.
3. bfec6c9a3a TextInput maxLength: shouldChangeTextInRange cuts paste with substringToIndex:room and userDidEdit trims at maxLength; both can split a surrogate pair or composed character (emoji). Use rangeOfComposedCharacterSequencesForRange. The trim also edits textStorage directly, bypassing undo and any marked text.
4. d10d8ab682: frame: holds the recursive mutex while running onRender on main; setOnRender takes it on the JS thread. Safe while onRender never waits on JS; record that invariant at the site.
5. edde76ec84 timeoutInterval maps XHR's total timeout to NSURLRequest's idle timeout (iOS RN parity, not a regression).

DRY: maxLength enforcement has two paths (text view delegate and post-edit trim for the NSTextField field editor); acceptable, but one helper would serve both. nativeJSON is the only bridge path; no duplicate.

Controls 478f390923 (independent): OneMacOS typed Toggle only and the mac entry declares One: any (routed to s69591). segmentDistribution omission: live capture r1-launch.png shows the flex-width control filling the rail, so no runtime gap; withdrawn. Button systemImage didSet computes imagePosition from the title at that moment, so a later title change keeps the old position. Disabled guard duplicated in Swift; labels rebuilt on every props update. Mark-all-read Button not pressed live (no unread flags; would change owner state).

Limits: no iOS/Android/web byte gate, no reload-under-load or perf run, no Packet B probe rerun beyond the live consumer fetches.
