---
id: t-mvlpwtpk-24230
title: Repair rounded overflow clipping in the native Mac host
status: done
labels:
- lane:one-macos
parent_id: t-mvlcdlx0-4px0
backend: git
sessions:
- s72723
commits:
- aa1caa54bb4ec13e24bdcae104d08bbef8303aa2
created_at: 1792805174120
updated_at: 1792805950366
field_marks:
  active_form: 1792805174120
  body: 1792805950366
  claim: 1792805795787
  claim_current:e6095564f157ddb1416653b915cad827: 1792805795787
  claim_state:891e5eb1b826ce08cf52bab6b4d6ade2:1792805194390:=s72723:=mc-3aa87nk0z4j17:1792805194390:f: 1792805194390
  claim_state:e6095564f157ddb1416653b915cad827:1792805795787:~:~:~:o:891e5eb1b826ce08cf52bab6b4d6ade2: 1792805795787
  commit_linked:aa1caa54bb4ec13e24bdcae104d08bbef8303aa2: 1792805679415
  evidence_summary: 1792805174120
  owner_status: 1792805174120
  parent: 1792805174120
  priority: 1792805174120
  recovery_ref: 1792805174120
  status: 1792805679628
  title: 1792805174120
---
Observed by native preview author s72684: rounded parent overflow hidden clips children as a rectangle; matching radius on Image works, but host base view should honor its own rounded clip. Current OneMacosComponentView.mm sets masksToBounds but no layer cornerRadius; draw/focus use uniform resolved top-left radius. Reproduce actual native child clipping, repair at the owning native view, falsify prop/layout/reset/visible overflow and runtime lifecycle once. Keep existing public API and native feature hold; no other platform bytes, no clean build, use warm producer target. Lead s69213 reviews source/proof; CI p103700 broader checks. Existing Contrast spec/plan native Mac content-first preview scope.

REVIEW: lead s69213. Source aa1caa54bb on tm/macos-resume (pushed, parent 947c29c8ed). Path: packages/one/macos/host/OneMacosComponentView.mm only.

Change: base view applyClip sets layer.masksToBounds and layer.cornerRadius = resolved uniform radius (same min(topLeft, min(w,h)/2) used by drawRect and focus ring) while clipping, 0 otherwise. Called from updateProps and updateLayoutMetrics so radius, overflow and size changes all refresh it.

RAN: incremental MacosBasic build on /Volumes/Samsung-1TB-990/builders/one-macos-resume (before and after), via tm window heavy.
TESTED: owned LSUIElement copy (~/Library/Caches/one-macos-rounded-clip/MacosClip.app), fixture clip-entry.tsx (bundle clip.js sha256 158f728864c79d01...), app-owned debug presses, real screencapture -l. Parent 240x80 radius 60 overflow hidden, child overhangs 10pt.
- before: all child corners red (square clip) in initial/short/remount/reload states. Reproduced.
- after: corners show parent bg 245 in initial, after resize, after unmount/remount, after host reload; radius reset to 0 gives red square corners; overflow visible still overhangs 10pt with red corners.
- falsification (arc.py): top-row red start matches expected arc for r=40 (27 vs 26.1 at row 2) and after resize to 40pt tall for clamped r=20 (11 vs 10.3); a stale 40 radius would give ~26.
NOT checked: transforms with clipping, Image/ScrollView subclasses specifically (they inherit the same path), consumer app.
Processes: fixture app stopped. Probe entry kept here only, not in tree.

Independent Codex lead reviewed complete aa1caa54bb and adjacent props/layout/paint/focus paths: APPROVED, no actionable defect. RAN author pixel falsification: before row2 red0 vs26.1expected, after radius40 red27 and resized radius20 red11 vs10.3expected; checked native capture/source supported uniform semantics. Review lead-review.md, no fresh native launch by reviewer. One branch canary40050679650 accepted exactaa1c; CI p103700 terminal/artifact verification, lead actual registry consumer followup, feature/stable hold unchanged.
