---
id: t-mvj0aq7y-qmm0
title: Review One PR1007 device-compatible SDK generator and regenerated bindings
status: done
assignees:
- r116863
labels:
- lane:one-sdk-device-archive
backend: git
created_at: 1792641220414
updated_at: 1792654513389
field_marks:
  active_form: 1792641220414
  assigned:r116863: 1792641259039
  body: 1792654513389
  claim: 1792641220414
  evidence_summary: 1792641220414
  owner_status: 1792641220414
  parent: 1792641220414
  priority: 1792641220414
  recovery_ref: 1792641220414
  status: 1792641594061
  title: 1792641220414
  unassigned:coordinator: 1792641259039
---
Nate2026-10-22 directly approved one replacement reviewer: "Yes, you can add one. You can do whatever." Scope is independent other-model review of PR1007, author s65128 (Opus), current head8e07948df5d33e32af03e3eb8cb086a87a021af9, branch tm/one-sdk-device-typecheck. Original95796/95800/95798 SDK chain exited; r116738 OSS SDK exclusion stays intact. Keep original author/source/device build producer; no duplicate archive or TestFlight dispatch. Review generator and regenerated binding completeness/device-versus-simulator compatibility, exact head verdict and bounded falsifying probe. CI96184 owns delivery. Reviewer result outside checkout, source/merge/canary custody author after independent approval and required checks; stable release still needs owner word.

Launched sole independent reviewer r116863 Codex Sol medium on pro64, source read-only existing One checkout. Original Opus author s65128 retains generator/regeneration/device proof and delivery. No second reviewer or native producer.

Independent review underway against pushed head 8e07948df5d33e32af03e3eb8cb086a87a021af9. Reading generator, app cache/generation identity, committed facade/declaration deltas and existing SDK plans. Bounded Xcode 27.1 availability probe only; no source edits, archive, release or CI observation. Author s65128 retains device build and delivery; p96184 CI owner.

# Independent One PR1007 review

Verdict: APPROVED. No blocking findings in reviewed head 8e07948df5d33e32af03e3eb8cb086a87a021af9, branch tm/one-sdk-device-typecheck, base b5d4a748c2ec046465665124be20ea93b5ef1b82. GitHub head was re-read immediately before verdict and remained unchanged. Approval applies only to this head; later changes are unreviewed.

Scope: generator df1332c77e and regenerated bindings/declarations 8e07948df5. Read generate.ts, its rejection mapping, app.ts cache/table/conformance flow, fingerprint.ts, declarations.ts, graph.ts, emit-ts.ts/protocol handling, SDK READMEs, author packet and Contrast one-ios-complete-coverage/interface-generation plans. Read-only source; existing foreign dirt preserved.

TESTED: one bounded Swift availability probe on Xcode 27.1 (27A9269), arm64 iOS17 targets, Swift5, explicit modules, C++20 interop, emit-sil. Same source compiles for iphonesimulator (exit0, 1.23s); iphoneos fails (exit1, 3.69s) specifically on Foundation.SocketPort and MTLResourceID.textureID. Common Port.isValid has no diagnostic. This could have disproved simulator-only availability; it corroborated it. NSPort.h:177 directly guards NSSocketPort with TARGET_OS_OSX || TARGET_IPHONE_SIMULATOR. Commands, source, full diagnostics and result are retained beside this handoff.

INFERRED from source: separate per-SDK target arguments and One runtime modules prevent using simulator artifacts for device compilation. Unioning both compiler diagnostics feeds the existing rejection loop, preserving the simulator check while dropping APIs that cannot compile on device. No handwritten API exclusion or duplicate generator was added. No simplification or DRY change is owed by this patch.

RAN generated-output audit: all 290 manifest frameworks have matching runtime facades and declarations, with no missing/extra names. Independently recomputed source fingerprint is 5d69670f0307b385, matching the manifest and all embedded table generations (273 facades contain table references; others have no calls). After normalizing only those two exact generation strings and union ordering, actual differences are Foundation and Metal, in both facade and declarations. Other files change identity/order only. git diff --check passed.

API losses: Foundation loses six SocketPort constructors and five getters, plus observation/registration entries for those getters. Metal loses MTLResourceID.textureID get/set. Probe confirms neither surface can ship in a common device/simulator table. Metal also narrows MTLDrawablePresentedHandler callback input and MTLIndirectCommandBuffer.indirectRenderCommandAt implementation result to SDKHandle. INFERRED: required device-only MTLDrawable members and six MTLIndirectRenderCommand methods invalidate simulator-derived JS implementations; direct SDK header comparison documents those requirements. Native handles remain accepted. No unrelated API loss found. SocketPort retains a facade shell/inherited Port members; it has no native SocketPort dispatch remaining.

Limits: no full regeneration, strict TS run, device archive/app run, simulator runtime or package/release validation performed by reviewer. Author reports Foundation before/after 8607/8596 entries and zero final errors on both SDKs, plus full regeneration; those are author observations, not independent reruns. Full device app build remains author-owned and is not certified here. Graph extraction still uses simulator declarations, so this fix establishes compile intersection, not coverage of device-only APIs. Existing compiler-process failure handling is unchanged.

Disposition: author s65128 owns fix/device-build/merge/canary after required checks; live CI p96184 owns broader delivery. Task t-mvj0aq7y-qmm0. No helper, worktree, service, watcher, claim, source change or native archive created. Probe processes exited; retained result files are review evidence. No downstream wait.

RAN reviewer r116863 finished: APPROVED exactPR1007 head8e07948df5d33e32af03e3eb8cb086a87a021af9 with final unchanged GitHub head check. Independent Xcode27.1 availability probe and290 framework/fingerprint audit passed claim. Full device archive/runtime/package acceptance not performed by reviewer, remains author s65128; live CI96184 owns broader delivery. Exact review handoff on pro64 /Users/n8/.team-machine/results/one-sdk-device-archive-review/handoff.md. Approval forwarded author+CI; review task complete only, not merge/release/product acceptance.

RELAYED coordinator independent reviewer r116863 CodexSol APPROVED OnePR1007 exact8e07948df5d33e32af03e3eb8cb086a87a021af9, no blocking findings; GitHubheadunchanged verified, simulator-only API fault qualified Xcode27.1probe andgeneratedmanifest/fingerprintcoherent. Approval NOT full device app acceptance. Sourceauthor s65128 retains full devicebuild/merge/canary custody andreceivedapproval. CI existingrequired-check routing only; no extra observer/build/reviewer or manualpublication. EvidencePro64 /Users/n8/.team-machine/results/one-sdk-device-archive-review/handoff.md.

Delayed author packet checked: plans/one-native-architecture.md requires respecting platform conditional compilation and compiler diagnostics, consistent with approval of head 8e07948df5d33e32af03e3eb8cb086a87a021af9. Verdict unchanged; later heads unreviewed. Author packet still described device compile as pending before OneSDKBindings, so it does not establish device build success. Handoff updated in place; prior tm finish was invoked once, no downstream wait or duplicate finish.
