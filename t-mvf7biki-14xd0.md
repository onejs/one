---
id: t-mvf7biki-14xd0
title: Add bounded same-slot Sheet interruption proof trigger
status: done
owner_status:
  state: landed
  text: fixture23b corrected hitlayout; actual native interruption and later physical completion verified
  updated_at: 1792412895385
assignees:
- p95796
labels:
- one-ios-sdk
parent_id: t-mvd1h69m-wa10
backend: git
sessions:
- p95796
created_at: 1792411149762
updated_at: 1792454969990
field_marks:
  active_form: 1792411149762
  body: 1792412895385
  claim: 1792454969990
  claim_current:792b961136fb44ca9a8c96163343c434: 1792454969990
  claim_state:34a5e5119525905806ac8b3b2d710d8f:1792411662210:=p95796:=mc-h39p4gbj818h:1792411662210:f: 1792411662210
  claim_state:792b961136fb44ca9a8c96163343c434:1792454969990:~:~:~:o:34a5e5119525905806ac8b3b2d710d8f: 1792454969990
  evidence_summary: 1792411149762
  owner_status: 1792412895385
  parent: 1792411149762
  priority: 1792411149762
  recovery_ref: 1792411149762
  status: 1792412895385
  title: 1792411149762
---
Native validator held0c +ce052 +driverc775/SDK90ad has no authored close-then-reopen trigger. Existing SheetContent onClose only setIsPresented(false), parent Open sheet is covered by presented sheet; delayed manual Open after dismissal proves ordinary reopening, not same-slot interruption. Need fixture-author JS-only trigger with explicit false/true React updates preserving same Sheet/SheetContent identity and observable run marker, plus later normal close, without unmount/rekey. Native in-process window attach/detach/physical-completion observation must establish interruption actually happened rather than infer from timer/JS count. Exact patch/source receipt for mirroring only fixture requested. Current source path owned by lead, validator will not independently edit it. Independent controlled medium->large->medium geometry/callback PASS and live revision0->1 while styled sheet open then close increments dismissal1->2 and next reopen/close3 PASS w-963bbd; evidence /Users/n8/.cache/one-sdk-docs/0c-ce052-ownership-frames.json and corresponding full WebP/logs. Existing full suite PASS, native-relative sizing accepted per pure SwiftUI reference. No native/SDK rebuild required for trigger.

RAN lead authored bounded styled-only trigger: explicitfalse Reactcommit, effect schedulestrue nextanimationframe; run/phase marker, sameunkeyedSheet+SheetContent retained, normalClose untouched. Actualfixture ReactintegrationprobePASS false->true commits, hostidentity/counterstate, no-triggerbasepath, ordinaryclose staysclosed. This does NOT establish nativeinterruption: validator musttrace nativeconfigurefalse andtrue plus same slotwindowidentity before firstdetach, no olddismiss and later normalcloseonce. No maintainedtests, nativecode orSDKchanges; awaiting sourcecommit receipt.

Pushed fixturec0e2897f18, 44linesstyled-onlyclose/reopencontrol and runmarker; sourcehanded s51006 to mirroronlyfixture ontoheld0c/90ad. Nativefalseconfigure/trueconfigure plus originalwindowidentity/attachdetach trace and lateronce-onlydismiss required, notinferredfromRAF. No productnativeinstrumentation or retries requested. Localdisposablefixtureprobe evidence sheet-interruption-fixture-probe.cjs passed; nativepending.

RAN native0c +fixturec0e +driverc775/90ad setup w-6ea2e9, single intended trigger w-6f2d8b. LLDB function-entry observer records mainhost0x13b5f7a00 false->true before slot0x11d955200 detach, then same slot detach/re-attach; no dismiss callback, counter1 preserved, UI run1 reopened, live rev1 PASS. Classify actual detach/re-attach, not continuously attached. Later Close tap fails because interrupt control overlaps Close center; saved markerrun2, second false->true, no dismissal. AXClose rect19.511/643.189/88.894/32.616, Interrupt19.511/649.265/184.503/30.377 covers Close center63.958/659.497. Request fixture-author layout fix so ordinary Close independently hittable. No second intentional trigger/no retry, no native bug claimed. Evidence /Users/n8/.cache/one-sdk-docs/0c-c0e-interrupt-classification.json, sheet-window-events.jsonl with0c-c0e prefix, interrupt-later-close.webp, observer sheet_window_observer.py. LLDB detached/quit, no production instrumentation. Observer pauses perturb timing; rawUIWindowpointer untraced, native slotidentity+attached traced. Later normal physical completion remains unproven; hold0c/90ad until bounded case settles.

RAN corrected fixture23b style delta only on held0c/90ad: verified separate Close/interrupt native rects gap7.67pt; parentrun2/rev1 preserved but childcount1->0 across hot fixture edit, no continuous React-state claim. No retrigger. Ordinary Close PASS w-cf39fd: SAMEhost0x13b5f7a00 false rev1 -> SAMEslot0x11d955200 attachedfalse/model0x144643480 -> onDismissrev1 EXACTLYONCE. UIclosed/count1/noSheet; later rev2 keepscount1, no second callback. Native ordering proof /Users/n8/.cache/one-sdk-docs/0c-23b-sheet-physical-completion.json +0c-c0e-sheet-window-events.jsonl, fullWebP0c-23b-ordinary-close, nonoverlap-frames.json. LLDB specific ownedPID21015 detached successfully and exited, no observation process left. First trigger classification remains detach/re-attach (not continuousattachment); timingperturbed, rawUIWindowpointer not traced, no Fabricrecycle claim. Lead can settle bounded proof with these limits; ABI067 refresh remains HOLDpendingreplacement.

TESTED s51006 w-cf39fd held0c/90ad+fixture23b: Close and interruptnativeframesseparate with7.67ptgap, no retrigger. Samehostfalse->true beforefirstdetach, sameslotdetach/reattach; no earlieronDismiss. LaterordinaryClose samehost0x13b5f7a00 false/live rev1 -> sameslot0x11d955200 attachedfalse/model0x144643480 -> onDismissrev1exactlyonce. UIclosed/dismisscount1/noSheet; revision2 causesnoextra callback. Nativeboundedownershipclosedwithlimits: no continuouslyattachedwindow/rawUIWindowpointer/timing/Fabricrecycleclaim; hotfixture HMR resetchildcounter so no continuousReactstateclaim acrossHMR. Evidence studio ~/.cache/one-sdk-docs/0c-23b-sheet-physical-completion.json, 0c-c0e-sheet-window-events.jsonl, 0c-23b-ordinary-close.webp, nonoverlap-frames.json; LLDBdetached/exited. Source23bpushed, no extra native/SDKbuild.
