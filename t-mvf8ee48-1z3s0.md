---
id: t-mvf8ee48-1z3s0
title: Verify and repair Popover authored content sizing
status: done
owner_status:
  state: landed
  text: authored Popover bounds and empty-reset behavior proved and merged
  updated_at: 1792451346955
assignees:
- p95796
labels:
- one-ios-sdk
parent_id: t-mvd1h69m-wa10
backend: git
sessions:
- p95796
created_at: 1792412963576
updated_at: 1792454969900
field_marks:
  active_form: 1792412963576
  assigned:p95796: 1792451273568
  assigned:p96232: 1792413563320
  body: 1792451346955
  claim: 1792454969900
  claim_current:8bf4c227bd1f771582a5a71e56714aa1: 1792454969900
  claim_state:8bf4c227bd1f771582a5a71e56714aa1:1792454969900:~:~:~:o:e83e6c3c2bde3d3d03bd96ce02eb3388: 1792454969900
  claim_state:e83e6c3c2bde3d3d03bd96ce02eb3388:1792413495952:=p95796:=mc-h39p4gbj818h:1792413495952:f: 1792413495952
  evidence_summary: 1792412963576
  owner_status: 1792451346955
  parent: 1792412963576
  priority: 1792412963576
  recovery_ref: 1792412963576
  status: 1792451346955
  title: 1792412963576
  unassigned:p96232: 1792451273568
---
RAN held0c/90ad native +driverc775 full existing popover suite PASS w-36a367 (touch, controlled/native dismissal, inline Trigger20 measurement, composedSection adaptive sheet, repeat navigation/remount2x). Required intrinsic sizing not accepted: untouched fixture authors main260x160 but saved main content AX group248x103, balloon incl arrow248x116; heading236wide atx22, observed balloon tightly fits controls. Source generated PopoverContentComponentView.layoutSubviews computes max extents of native subviews. INFERRED flattened RN root may lose authored trailing blank/padding, but native bounds/cause not independently isolated. Need native in-process UIView/measurement validation before source correction, no synthetic fixture collapsable fix accepted as general API repair. Evidence /Users/n8/.cache/one-sdk-docs/0c-popover-sizing-observation.json,0c-popover-existing/popover-open.{webp,ax.json},popover-section.{webp,ax.json}. Original master recorded firstpresentation; bounded faststartH2640c-popover-first-present.mp4 retained, flash claim UNPROVEN. Section default compact adaptation correctly sheet; authored240x120 bounds pending separate content measure. No retry/source edit/newbuild/SDKupdate. Held0c app and90ad pair preserved pending lead artifact replacement for MainActor metadata.

RAN nativeowner reportsinteraction suitegreen butauthored260x160 vs AX248x103 mismatch, no assumedflatteningcause. Lead starts sourcepathread thenroutesconcreteinteropcase tocontinuingOpusmediump96232; nativeUIViewbounds/measurement/shadownodefacts requiredbefore sourcechange. Preserve generalAPI, no fixturecollapsableworkaround or restoredexplicitPopoverprops. No newSDKproducer/build now; held0c/90ad kept under s51006.

Leadread emitPresentedSlotgenerictemplate andcurrentPopoverwrapper/SlotShadowNode: templateunionsdirectnativechildframes; ReactwrapperNativeContentcollapsablefalse doesnotguaranteeitsauthoredcontentroot survivesflattening. RAN sourceexistence, flatteningcauseINFERREDonly. ContinuingOpusmediump96232assignedthisboundedexistingAPIrepair alongsideinitialinteropreview, no newAPI/explicitdimensionprops/fixtureworkaround. s51006requestedminimalnativeUIViewbounds/directchildframes/modelmeasuredsize(andFabricmetricsifavailable) onheldappbeforeedit; authorcanreceiveconcretediagnosticdirectly. Preservefull290leadproducer/sharedSlotcontractuntilcausegrounded.

TESTED native s51006 diagnosis independentlyofAX: actualmainUIView248x103, section228x29; authored260x160/240x120 rootviewsflattenedabsent; allnativechildrenvisible. SAMEcontent Fabriclayoutmetricsretainoverflowright/bottom12/57 and12/91, respectively, reachingauthoredextents. Sectioncallback228x29captured; maincallbacknotinterceptedonretainedpresentation, nativechildmax248x103 followsactualsource, notcallbackclaim. Receipt studio ~/.cache/one-sdk-docs/0c-popover-native-diagnosis.md delivered directlyoriginalauthorp96232. No source/build/SDKchanges; LLDBdetached/held0c90ad preserved. Authorownsmeasurementsourcefix withoutfixtureworkaround; existinglayoutoverflow/visiblecontentpolicy requiresboundedactualproof, no inferenceallcontainersfixed.

p96232 2026-10-19: cause RAN-confirmed by s51006 LLDB (direct children (12,12,236,17),(12,37,236,29),(12,74,236,29), no 260x160 root; flattened layout-only root). Repair pushed 21ae0f1cff on tm/one-sdk-docs: OneNativePresentedSlotShadowNode (cpp/OneNativeSlotShadowNode.h) unions children Yoga frames in layout() and stores state.content via setStateData (RN ScrollViewShadowNode pattern); Popover content and Sheet content views report state.content instead of scanning mounted subviews; updateNativeFrame keeps prior state. Other slot types unaffected except an ignored state field. Validation: generate --check verified only; not compiled, no sim. Needs p95798 review and s51006 build + popover 260x160/240x120 and Sheet fitted proof.

TESTED independent review49 of21ae: exact header algorithm plus extracted native report methods (Fabric layout/state doubles) yields authoritative0x0 after positive240x120 -> hidden/allchildrenremoved, but report positive-only guards and existing Popover/Sheet model guards retain stale240x120/height120. Not a native UI reproduction. Originalauthor p96232 assigned fix-forward: clear stale fitting measurement on authoritative empty layout, reject invalid finite/negative input, no forced physicalsheetheight0; replay hidden/empty/positive restore, preserve ordinary slots. Currentexactc235/d968 native build may proceed once as assigned, with sizing acceptance held until correction. Other geometry/state/idempotence controls passed. Batch48 d968 delivery independently APPROVED; core metadata hold cleared.

TESTED reviewer49fix:1ff ordinary240x120 ->hidden ->restore ->empty ->restore passes exact reports and compiled models, invalid negative/NaN/inf rejected. RemainingP2: halfpoint model tolerance suppresses sentinel transition120->0.25->0 and0->positive<0.5; stale0.25 imposes geometry rather than proposal. Originalauthor p96232 assigned bypass only zero/nonzero modecrossings (eachPopoveraxis and Sheetheight), retain ordinary positive tolerance/invalid rejection, noSDKproducer. Nativebuild remains serials51006, exactsource receipt required, no interruption of an underway build.

RAN b6b5cca6dc pushed on branch: zero/nonzero transitions bypass tolerance perPopoveraxis and Sheetheight, ordinarypositive changes retainhalfpoint suppression. Authorcompiledexactgeneratedmodels prove120->0.25->0 and0->0.25, asymmetricaxis controls and invalid inputs, baseline1ff red. Standingreview assigned remaining boundary only. Nativevalidator restoredheldPodfile.lock byte-identical,181dependency versions and SDKtables unchanged, one warmnativebuild pinned1ff inprogress; do not interrupt for b6. Final acceptance will distinguish1ff geometry from b6 fractional-reset fix; no newSDKgeneration.

RAN current native build b6b5cca6dcfb864b143be77716c408942e01ee4f + exact1087 header + ce9Menu mirrors PASS w-79a2c9; ABI d968. Installed matching binary1d6888dffe8f53882b16897a385013e18d5c10d58ec33c1ef676f09b691f07eb, startup/indexPASS. Actual LLDB UIView bounds main260x160, section240x120 with window attached; exact measured callbacks same values and Fabric metrics same; touch/Taps1/close/section presentationPASS w-67bd13. Evidence /Users/n8/.cache/one-sdk-docs/b6-popover-main-native-bounds.txt, b6-popover-section-native-bounds.txt, b6-menuce9-popover-native-events.jsonl, fullWebPs b6-popover-main.webp/b6-popover-section.webp. Observer detached. Initial bounded-driver optional Open tap accidentally opened main then asserted obscured launchbutton; preserved failurelog, diagnosed with actualAX Open:true/body and continued currentstate, no app retry. Full Sheet regression w-915544 active independently. Empty-clear/restore and fractional-boundary native model acceptance remain unproven; no stale standing-review wait, lead owns review after p95798 stop.

RAN full existing Popover lifecycle suite PASS w-87525e2m43 on b6+1087header+ce9Menu/d968 without debugger: trigger20, React content touch, controlled/native dismissal/reopen, Section presentation and two navigation remounts. Artifacts /Users/n8/.cache/one-sdk-docs/b6-menuce9-popover-existing.log and directory. Positive actual UIView bounds proven separately; empty/restore remains pending author fixture, no closure claimed.

RAN s51006 actual native Popover260x160 main and240x120 section, callbacks/Fabric agreement, touches and full unchanged Sheet suite PASS on b6+1087+ce9/d968. Remaining authoritative-empty UI case unblocked with author fixture1e222c670f+70d4730053: clear/hide/restore same authored root, default unchanged. Exact bounded fixture mirror authorized; chips outside presentation require mode change then reopen. Not claiming continuous presentation under mode changes or empty/restore native acceptance yet.

RAN JS-only fixture70d4730053 on nativeb6+1087header+ce9Menu/d968 PASS w-69c0e150s. SAMEnativehost0x14730a800 measured callback sequence260x160 ->0x0 ->260x160; root instances remains1, restoredTap1. Clear removes children but keeps authored260x160 root, so not zero. Hide display:none resets authoritative0x0; UIKit popup physical minimum68x68 is not a failure/zero-height promise. No fractional-positive/productionFabric-recycle claim. FullWebPs b6-70d-{full,empty,hidden,restored}.webp; exactnative/fixture/hash/log/limits receipt /Users/n8/.cache/one-sdk-docs/b6-70d-popover-transition-receipt.json. Prior retained-home-scroll setup failures preserved; normal launch fixed setup. Observer detached cleanly. Authorized100c coherent refresh next.

RAN s51006 exact native b6+1087header+ce9Menu/d968 with fixture70d: Clear/Hide/Restore PASS same host callbacks260x160->0x0->260x160, rootinstances1 and restored tap1. Clear retains authored fixed root, Hide resets authoritative measurement; UIKit minimum68x68 visible popup is allowed, no physical-zero or fractional claim. Existing Popover lifecycle, Tabs/Menu and full unchanged Sheet suite PASS. Evidence b6-70d-popover-transition-receipt.json+WebPs under native validator cache, debugger detached. Concrete flattened-root sizing and empty reset causes closed with actual app proof. No exhaustive/first-flash acceptance gate added. s51006 already moves to authorized exact100c coherent app update; no parallel producer.

2026-10-19: p96232 transferred to lead p95796 at close-out; scope frozen at release candidate per owner direction, no unfinished p96232 source pending.

Lead closeout: sourceb6 and followup header/Menu repairs are in merged PR961/main (ancestry verified). Existing records prove actual native260x160/240x120 authored bounds, callbacks/Fabric agreement, touches, full Sheet and Popover lifecycle, same-host Hide0x0/Restore260x160 and rootidentity1. No unfinished product/source or native blocker remains for this bounded task; UIKit physical minimum/fractional/first-flash limits stay as recorded. Stable publication tracked separately.
