# vxrn/native senior review

Review date: 2026-09-19. Scope: the last 24 hours of native and vxrn work on
`origin/feat/one-native-superset`, plus the reported in-flight work from
`native-codegen`, `native-android`, `native-ios-views`, and
`one-native-superset-lead`.

## Verdict

**INFERRED:** The branch is a useful prototype with a strong iOS generation
core, but it is not merge-ready. Four landed correctness defects had bounded
fixes and are fixed on `tm/review-vxrn-native-fixes`. The remaining blockers
are composition-boundary semantics, an Android runtime proof on the assembled
head, the temporary source-export workaround, and finishing the catalog/native
contract before adding more surface area.

**RAN:** The review base was `0b204c723`. The workers' later commits
`0272b7f53`, `bb6213fdf`, `db397aa27`, and `6ab56f303` were reported through
their live output but were not present in this checkout or any fetched remote,
so their source could not be reviewed. A different observation would have been
`git cat-file -t <sha>` succeeding.

## Fixed findings

### P0: Android accessibility code did not compile against the pinned Compose UI

**RAN:** `OneNativeComposeNodeView.kt` referenced `Role.Dialog` and
`Role.ProgressBar`. The pinned `androidx.compose.ui:ui:1.11.4` artifact exposes
neither member. `javap` showed the available role members and the separate
`dialog()` and `progressBarRangeInfo` semantics APIs. A different observation
would have been either missing member appearing on `Role.Companion`.

**RAN:** Commit `2318d0468` uses the actual dialog and progress semantics APIs,
maps checkbox to `Role.Checkbox`, and retains Button and Switch role mappings.

### P1: Android Slider silently changed the public step contract

**RAN:** The native implementation truncated a fractional interval count,
clamped intervals above 1001, treated `step == range` as continuous, and sent
raw Float values even for a discrete Slider. A different observation would
have been an exact interval calculation plus callback snapping.

**RAN:** Commit `2318d0468` rejects non-divisible, excessive, or Float-collapsed
ranges in TypeScript; computes Compose steps from the exact public range; and
snaps callbacks to the declared Double grid.

### P1: generic leaf derivation confused repeated unlabeled parameters

**RAN:** `deriveLeafSwift` built a map keyed by argument label. Swift signatures
can contain multiple `_` parameters, so every unlabeled argument was checked
against the last `_` type. A different observation would have been positional
matching in the original implementation.

**RAN:** Commit `4c8f55b59` validates every argument against the constructor
parameter at the same position and adds a repeated-unlabeled-argument proof.

### P1: mounted SwipeActions marker props became stale

**RAN:** `OneNativeSwipeActionsActionsView.configure` changed plain stored
properties after its parent had copied them into `SwipeActionsModel`; it did
not ask the parent to republish. A different observation would have been a
published model update or parent callback.

**RAN:** Commit `527b780ec` republishes when `edge` or `allowsFullSwipe` changes
and clears the callback on removal and recycling.

## Remaining findings

### P1: invalid composition children fail differently by platform

**RAN:** Compose container types accept `ReactNode`. Android's
`OneNativeComposeNodeManager.requireComposeChild` throws for any mounted RN
view that is not `OneNativeComposeNodeView`; iOS
`OneNativeContainerView.insertChild` keeps the UIView in `childViews` and omits
it from `published.items`. A different observation would have been a shared
Slot conversion or the same explicit rejection on both platforms.

**INFERRED:** Define one schema-level child capability and enforce it at the
native boundary. Arbitrary RN content should require a real Slot. Until Slot
exists on Android, both platforms should produce the same explicit unsupported
child error. Direct React element checks can remain as earlier diagnostics but
cannot enforce custom-component output.

### P1: iOS activation is attached to individual publication, not the visible root

**RAN:** `OneNativeContainerView.composeInto` calls `setActive(true)` even when
its parent tree is detached. `decompose` deactivates only the immediate
container, while `reset` is the only recursive decompose path. A different
observation would have been root state propagated through descendants.

**INFERRED:** Make visibility/activation a root-propagated lifecycle state
before adding more presentation controls. Validate a nested presenter mounted
before root attachment, detach/reinsert, and recycling with exactly-once
events and no surviving presentation.

### P1: Android expansion bypassed its generation-first architecture gate

**RAN:** `a01574299` added 1,444 lines across handwritten Kotlin, TS adapters,
specs, validators, and tests. `plans/one-native-android.md` requires a
five-declaration source/binary inventory spike before broad catalog expansion
and names Host, Slot, and Dialog as the first assembled runtime boundary. A
different observation would have been generated declarations and compiled
recipe provenance preceding the added controls.

**INFERRED:** Freeze new handwritten Compose nodes. Land the five-declaration
inventory plus recipe compiler, then move TextField, Slider, dialogs, and
progress into that path. Keep the current code as the behavior oracle during
the migration.

### P1: Android's new assembled surface lacks a final runtime verdict

**RAN:** The Android worker reported the conformance emulator being terminated
mid-run and recorded status at `6ab56f303`; the latest FIX8 suite was not
completed. A different observation would have been a complete suite result on
the assembled head.

**INFERRED:** One owner should run the full Android conformance suite on the
final assembled branch and record the APK/source SHA. This gate must cover
TextField acceptance/rejection, Slider discrete values, both dialog dismissal
paths, progress semantics, rotation, remount, and duplicate-node sweeps.

### P1: the package currently publishes raw source as the React Native entry

**RAN:** `3554349f4` changed all `react-native` export conditions from built
files to `src` because the build stripped the generic call that triggers RN's
static view-config transform. The codegen plan records static dist emission and
a later revert to dist as unfinished. A different observation would have been
static configs in built ESM/CJS specs with exports restored to dist.

**INFERRED:** Treat the source export as a development bridge. Finish the
plugin-parity emitter, post-build spec transform, and artifact-level parity
test; validate a consumer from packed output; then restore dist exports before
merge readiness.

### P2: `useNativeState` is shared React state, not a native observable handle

**RAN:** `src/nativeState.ts` stores the value in a React ref and calls
`useState` to schedule a render. Its documentation correctly says the handle
does not cross the native prop boundary and writes travel through React. A
different observation would have been native state identity transported to
SwiftUI or Compose.

**INFERRED:** Keep the hook if renamed or documented as a JS convenience, but
do not count it as the native-state prerequisite for identity-based modifiers
such as scroll position. Reserve the `NativeState` contract for a handle that
the generated adapters can transport and observe natively.

### P2: iOS container coverage remains incomplete

**RAN:** Lazy stack code hardcodes `spacing: nil` even though Double/Float
generation support now exists. Pager lacks the scheme bridge used by List,
ScrollView, lazy stacks, and the other transparent M2 containers. A different
observation would have been spacing in catalog/spec/native configuration and a
Pager scheme bridge.

**INFERRED:** Finish LazyVStack/LazyHStack spacing and Pager color-scheme
inheritance before starting M4 modifiers. Review the in-flight List/Pager flex
change from source before integration because its commits were unavailable in
this checkout.

### P2: SDK closure and modifier work remains intentionally incomplete

**RAN:** `generate:check` used SDK 27 while targeting the SDK 26 ceiling and
reported 11,614 declarations, 225 mapped symbols, and 173 generated files. The
codegen plan still marks closed-world generation and static view-config output
as pending. A different observation would have been a locked declaration
contract independent of newly installed SDK contents.

**INFERRED:** Land the additive static view-config parity unit now. Keep the
closed-world semantic switch behind its stated CI owner review, then prove both
the selected ceiling and a newer installed SDK produce the same supported
contract.

## Architecture assessment

**INFERRED:** The strongest reusable design is the schema-driven iOS leaf
generation plus the shared controlled-event protocol. Positional SDK matching,
explicit ceiling provenance, and compile-checked emitted Swift are the right
direction.

**INFERRED:** The weakest boundary is native composition. Child capability,
root activation, RN Slot ownership, accessibility, and layout ownership need
one cross-platform contract before more declarative components are added.
Handwritten per-control expansion increases the migration cost while this
boundary is unsettled.

**INFERRED:** Cross-platform consistency should mean shared lifecycle, state,
event, capability, and validation semantics. It should not require identical
SwiftUI and Compose component catalogs where the native platforms differ.

## Validation

**TESTED:** `bunx vitest run` in `packages/native` passed 11 files and 110
tests. The focused derive and Compose run passed 29 tests, including the new
negative cases.

**TESTED:** `bun run generate:check` passed and typechecked the generated Swift;
`bun run typecheck` passed; `git diff --check` passed.

**RAN:** Compose UI 1.11.4 bytecode inspection confirmed the semantics symbols
used by `2318d0468`. A full Android Gradle build was not available in this
checkout because the fixture's generated Android project is absent. The
assembled Android worker or coordinator must compile the commit with the final
app.

## Integration order

1. **INFERRED:** Cherry-pick `4c8f55b59`, `2318d0468`, and `527b780ec`, then
   resolve any overlap with the Android worker's unpushed compile fixes.
2. **INFERRED:** Review and assemble the workers' unavailable commits by source,
   especially `0272b7f53` and the Android status head.
3. **INFERRED:** Complete one Android build and conformance verdict on that
   exact assembled SHA.
4. **INFERRED:** Finish static dist view configs and restore built React Native
   exports.
5. **INFERRED:** Specify and implement the composition boundary, then resume
   catalog expansion and M4 modifiers.
