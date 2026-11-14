---
id: t-mvkvrfdb-5li0
title: Review native gradients and transparent color distinction
status: done
assignees:
- s69811
labels:
- one-macos-native
- review
parent_id: t-mvknc99k-k8t0
backend: git
sessions:
- s69811
created_at: 1792754533775
updated_at: 1792759341891
field_marks:
  active_form: 1792754533775
  body: 1792754686342
  claim: 1792759341891
  claim_current:3e6f0127619375fa8041a34de40b3270: 1792759341891
  claim_state:3e6f0127619375fa8041a34de40b3270:1792759341891:~:~:~:o:8887a31ca4ee38fb5cacddd60ab11edd: 1792759341891
  claim_state:8887a31ca4ee38fb5cacddd60ab11edd:1792754590846:=s69811:=mc-3aa87nk0z4j17:1792754590846:f: 1792754590846
  evidence_summary: 1792754533775
  owner_status: 1792754533775
  parent: 1792754533775
  priority: 1792754533775
  recovery_ref: 1792754533775
  status: 1792754700883
  title: 1792754533775
---
Independent Opus review of Sol-authored producer5ebe5b10ea: standard RN linear-gradient painting and Mac Color defined state separating explicit numeric transparent black from absence. No broad earlier-host re-review. Source /Users/n8/.worktrees/one-macos-resume; proof /Users/n8/.team-machine/evidence/one-macos-gradient-s69799. Native final archive still being built by author, do not consume mutable archive or write shared cache. Read geometry/color/hash contract, try a bounded actual-source probe for omitted/outside/equal stops, transparent/semantic/undefined controls. Existing opaque bitmap geometry/appearance proof can be inspected; final transparency/native reload acceptance remains author+consumer. Review in native SDK prerequisite wait, do not spawn, no source edits. Return actionable findings/verdict/limits. CI ci-manager; lead owns delivery.

# Review of 5ebe5b10ea (native Mac linear backgrounds, Color defined state), s69811

Scope: DrawLinearGradient in packages/one/macos/host/OneMacosComponentView.mm and the defined_ flag in
packages/one/macos/cpp/graphics/react/renderer/graphics/HostPlatformColor.h. Read-only; did not touch the
author's archive or cache. Probe: probe.mm / probe.txt here (standalone AppKit + CoreGraphics, not linked to One).

1. Crash on a PlatformColor stop that cannot convert to sRGB. TESTED.
   DrawLinearGradient does [colors addObject:[OneMacosColorFromSharedColor(c) colorUsingColorSpace:sRGB]].
   createSemanticColor accepts any NSColor class getter, and linenColor, scrubberTexturedBackgroundColor and
   transparencyCheckboardPatternColor return nil from that conversion in light and dark (probe.txt). addObject:nil
   throws NSInvalidArgumentException inside drawRect. Disproof: a run showing those return non-nil.
   Fix: return when the conversion is nil, like the transition-hint case.

2. Transparent between two colors picks up the wrong hue on its far side. TESTED (CG math), INFERRED (in host).
   The transparent-black fix copies only the previous visible stop's hue. For red, transparent, blue it emits
   red@0, red α0@0.5, blue@1; CG interpolates unpremultiplied, so x=75% reads premultiplied 64,0,69,132 (purple).
   CSS premultiplied gives about 0,0,128,128. Fix: when transparent black has visible stops on both sides, emit
   two stops at that location (previous hue α0, next hue α0); otherwise use the one neighbor. That also removes
   the two search loops.

3. Color defined state: no defect found. INFERRED from source.
   SharedColor::operator bool compares with UndefinedColor; Color(int32_t) and platform colors are now defined, the
   default is not, == checks defined_ first, and equal colors still hash equally (undefined and transparent share a
   hash, which is a permitted collision). Explicit transparent text and borders now draw clear instead of falling
   back (text previously fell back to textColor), matching iOS.

Angle math, magic-corner keywords, length, stop fixup and endpoint move for out-of-range stops: checked by
hand against CSS; no defect. Not run: the app, a reload, or the final archive.
