# one-native architectural review at 3dcfe61d2

Scope: decide what to fix before adding controls, picker families, sheets, and richer
tabs/toolbars. Read-only. No implementation, no runtime QA, no planning commits.

## Verdict

The runtime foundation is sound and the composition rule it implies is the right one.
The generator is the part that does not survive the next expansion, and I can show that
with the SDK rather than argue it. Fix seven things first; three of them are the
generator, two are Swift duplication that doubles at every new host, two are stated
contracts that do not exist yet.

Do not build a universal SwiftUI engine. Three narrow shared pieces earn their place
because they remove duplication in the next three to four components. The fourth
candidate (arbitrary modifier lowering, content-sized boundaries) does not yet.

---

## 1. The generator breaks on the exact next components

### 1a. Constructor identity by argument-label array is not unique  (RAN)

`catalog.ts` names an SDK initializer by its array of argument labels, and
`generate.ts:92-107` filters on that, sorts by lowest iOS, and takes `[0]`.

I ran the checked-in extractor against the installed iPhoneSimulator 26.4 SDK and
grouped public inits by label set:

| Type | public inits | distinct label sets | label sets with >1 candidate |
| --- | --- | --- | --- |
| Picker | 41 | 17 | **12** |
| TextField | 45 | 19 | **15** |
| Stepper | 23 | 13 | 5 |
| DatePicker | 16 | 4 | 3 |
| Slider | 13 | 13 | 0 |

`Picker(_:selection:content:)` alone has three candidates at iOS 13.0, 16.0 and 13.0.
The catalog cannot say which one it means, and the lowest-iOS sort silently picks a
13.0 overload.

This already misfires today. `Section(content:header:)` has two candidates: the
`@_alwaysEmitIntoClient` iOS 13 one with `header: () -> Parent`, and the iOS 16 one with
`header: () -> H`. The generator picks the 13.0 one, and `codegen/swiftui-manifest.json`
records `Section 13 [('header', '() -> Parent')]` as the provenance for generated code
the compiler may well resolve to the other overload. The manifest is the artifact that
is supposed to prove what was bound to what, and for Section it is already wrong.
`Tab(value:role:content:label:)` likewise has two candidates, both iOS 18, distinguished
only by generic parameter name; which one is recorded depends on filter order.

Fix: key a catalog entry on labels **plus parameter types**, require exactly one match,
and throw on zero or on ambiguity. Ambiguity becomes a build error instead of a coin flip.

### 1b. The availability regex misses Apple's long form  (RAN)

`generate.ts:52-60` matches `\biOS\s+(?:introduced:\s*)?(\d+...)`. That requires
whitespace right after `iOS`, so `@available(iOS, introduced: 13.0, deprecated: 100000, message: ...)`
does not match and `Math.max(0, ...)` returns 0.

The SwiftUI interface contains 148 declarations in that form. 102 public declarations
score `ios == 0` this way, and six of them are `TextField.init`. Scoring 0 puts a
soft-deprecated overload at the very front of the lowest-iOS sort, so it beats the
modern one. The first control family on the list walks straight into it.

Fix: parse both forms, and treat an availability attribute the parser does not
understand as an error rather than as "available since iOS 0". Also exclude
`deprecated:` declarations from selection.

### 1c. Nothing compiles the generated Swift  (TESTED)

`bun run generate:check` compares bytes. The only thing that ever compiles the
generated constructors is a full app build. The catalog's `swift:` strings are raw
Swift source pasted into output with no link to the `constructors` list that is
supposed to be validating them.

A gate exists and costs nothing:

```sh
xcrun swiftc -typecheck -sdk "$(xcrun --sdk iphonesimulator --show-sdk-path)" \
  -target arm64-apple-ios18.0-simulator ios/*.swift ios/Generated/*.swift
```

Exit 0 today, about 8 seconds, no Xcode project needed, and it typechecks at the
podspec's minimum deployment target rather than the build SDK. Negative control:
adding a bogus argument label to the generated `menuOrder` call makes it exit 1 with
`error: extra argument 'bogusLabel' in call`. So it is a real check.

Wire it into `generate` and `generate:check`. The repo already runs macOS with
Xcode 26.4 in `test-native-ios.yml`, and `generate:check` is currently in no workflow
at all, so generated output can drift from the catalog with nothing noticing.

Once this gate exists, the compiler becomes the authority on overload resolution, which
is what `plans/one-native-architecture.md` section 6.6 already says it should be.

### 1d. Smaller generator debt, cheap now and annoying later

- `nodes[].fields` is `string[]` and `generate.ts:153` indexes `fields[name as keyof typeof fields]`.
  A typo in a node's field list is a runtime crash, not a type error. Typing the field
  list as `(keyof typeof fields)[]` gets this for free.
- `modifiers[].default` is dead. It is recorded into the manifest and never read by any
  emitter. Delete it.
- `menuOrder`'s default lives in three places with two different values: `fields.menuOrder.default = ''`,
  `modifiers[0].default = 'automatic'`, and `Menu.native.tsx` prop default `'automatic'`.
- `unmappedModifiers` is scoped by the hardcoded regex `/^(menu|tabBar|tabView|controlGroup|palette)/`.
  The coverage number is hand-maintained and silently under-reports the moment a
  component outside those prefixes lands. Derive the scope from the catalog.
- `constructors[]` is a parallel source of truth beside `nodes[].swift`. Delete it and let
  each node declare the initializer it calls.
- `menuItems.ts` is a generated **interpreter**: it embeds a JSON copy of the catalog and
  walks it at runtime. The generator knows every field at build time, so emit straight-line
  per-kind validators, or gate the whole thing on `__DEV__`.

### 1e. Structure

`generate.ts` is 495 lines of top-level script with inventory, policy and ten emitters
interleaved as string concatenation. The plan's own section 6 asks for three stages.
Splitting it into `inventory / schema / emit` is worth doing now because every new
component otherwise means editing the middle of that script, which is the opposite of
work you can hand to a cheaper agent.

Do it by introducing one normalized schema object as the only thing emitters read. That
also produces the artifact soot needs (section 4).

---

## 2. The composition rule exists but is not written down

`Swift.Tabs` takes React children and checks `child.type !== Tab`. `Swift.Menu` takes a
flat data array. Those look inconsistent, but they are actually the correct rule:

> A Fabric child component when the thing hosts an RN subtree. A data payload prop when
> the thing is pure native content.

Tabs hosts RN pages, so tabs must be real Fabric children. Menu items are SwiftUI views
with no RN content, so they are data. The problem is only that the rule is unstated, and
the next four components straddle it: a picker's options are data, a sheet hosts an RN
subtree, and a toolbar is both (native items, some of which host custom RN views).

Write the rule into the README and the plan, with the escape hatch: a host may take a
data payload for its native content **and** named RN slots where content demands it.

One thing the flat payload got right and should keep: RN codegen cannot express nested
object arrays, and the `parentId` flattening dodges that. Record the reason so nobody
"simplifies" it back into a tree.

---

## 3. Two duplications that double at every new host

### 3a. There are already two RN slot implementations

`NativePageSlot` / `SlotView` (Tabs) and `OneNativeMenuTrigger` / `TriggerSlot` (Menu)
diverge on four axes: who owns the child's frame, whether allocation is reported to
Fabric state, whether interaction is enabled, and whether accessibility is hidden.

Two hosts, two copies, of the hardest code in the package. Sheets, popovers, toolbar
custom views and the `Swift.RNView` the plan already promises are all next, which makes
this five or six subtly different copies. The plan says explicitly that `Swift.RNView`
"should use exactly the same slot implementation as automatic boundaries", and today it
would not.

Collapse to one `OneNativeSlot` with an explicit mode:

- `fill`: SwiftUI allocates, slot publishes the rect into Fabric state (today's tab page)
- `passive`: Yoga owns the frame, slot reports nothing, no interaction (today's trigger)
- `content`: reserved, Yoga measures and reports upward (deferred, see section 6)

Plus an explicit interaction and accessibility policy per mode. This is the one shared
abstraction I would build unprompted, because it pays back at host number three.

### 3b. Menu content is welded to one Fabric component

`ios/Generated/OneNativeMenuPayload.h` emits
`OneNativeMenuPayload(const std::vector<facebook::react::OneNativeMenuItemsStruct>&)`.
That C++ struct type is generated per component. A toolbar-item menu or a context menu
gets `OneNativeToolbarItemsStruct`, so it needs a second converter. `OneNativeMenuModel`
also lives in the authored `OneNativeMenuView.swift`, so a second host has to import it
or copy it, while `OneNativeGeneratedMenuContent` and `OneNativeMenuNode` are already
reusable as written.

Make the converter emitter take a list of hosts and emit one per host from the same node
schema. It is a loop. Do it before the second host exists rather than after.

While you are there: `OneNativeMenuView.configureItems` calls `OneNativeMenuPayload(...)`
**before** the `isEqual` check, so every unrelated prop change allocates the whole
NSArray of NSDictionary. The fixture triggers exactly this by changing the menu's padding
on toggle. The obvious C++ fix does not work: I read the generated
`tests/native-features/ios/build/generated/.../OneNativeSpec/Props.h` and
`operator==` on `OneNativeMenuItemsStruct` exists only under `#ifdef RN_SERIALIZABLE_STATE`.
So emit an equality helper next to the converter from the same field list, about eight
lines, and compare before converting.

---

## 4. Controlled state: the protocol is specified and only half built

`Swift.Tabs` has the acknowledgement protocol: numbered native events, `acknowledgedEvent`
prop, `Math.max` monotonic ack, native guard `acknowledgedEvent >= model.eventCount`.
It works and it is hand-written inside `Tabs.native.tsx` and `OneNativeTabsView.swift`.

Menu toggles have none of it. `OneNativeMenuContent.swift` builds
`Binding(get: { item.values[index] }, set: { model.changeValue(...) })`, so the getter
reads the prop. Every tap is a JS round trip before the switch moves, and with a stalled
JS thread it does not move at all. The plan section 5 says the setter must change a local
interaction value immediately and queue the event; that is the part that is missing.

Toggle, Slider, Stepper, Picker, DatePicker and TextField all need the identical
protocol. Writing it a seventh time by hand is the duplication that justifies an
abstraction. Build it once, two small pieces:

```swift
// ios/Binding/OneNativeControlled.swift
final class OneNativeControlled<T: Equatable> {
  func binding() -> Binding<T>                   // optimistic local value, queues a numbered event
  func apply(_ value: T, acknowledged: Int)      // ack ordering rules from plan section 5
}
```

```ts
// src/controlled.ts
const { nativeValue, acknowledgedEvent, onNativeChange } = useControlled(value, onChange)
```

Port tabs and menu toggles onto it as the proof, then every new control is a catalog
entry plus a thin component view. The plan also asks for an explicit reset revision for
programmatic overrides that must cancel a pending interaction; add it here rather than
per control.

---

## 5. Fabric or Nitro

Stay on Fabric. Revisit only against a named payload that RN codegen cannot express.

What the current code actually needs from the transport, read off the source:

| Requirement | Where | Fabric | Nitro |
| --- | --- | --- | --- |
| array-of-struct prop | menu `items` | yes, plus a generated ObjC++ converter | yes, typed, converter unnecessary |
| direct events | all three components | yes | yes |
| custom C++ ShadowNode + custom State | `OneNativeTabShadowNode`, `adopt()` sets Yoga size from native state | yes | unclear, see below |
| `getContentOriginOffset` override | same, keeps descendant coordinates honest | yes | unclear |
| child mount interception | `mountChildComponentView` hands RN child views to SwiftUI slots | yes | unclear |
| `prepareForRecycle` | both hosts | yes | yes |

The only thing Nitro clearly removes is the ObjC++ payload converter, which is already
generated and is about twenty lines. The three "unclear" rows are the load-bearing ones,
and every future RN-hosting component needs them.

- RAN: Nitro is in no `package.json` in this repo and is not installed. Adopting it adds
  a second codegen pipeline and a pod to every consumer app.
- INFERRED, not verified in this session: Nitro view components own their shadow node, so
  a custom `State` type and `mountChildComponentView` are not reachable. The check that
  settles it is reading Nitro's generated ComponentDescriptor and ShadowNode for a view
  component and confirming whether a custom State type and a mount override are exposed.
  If they are not, Nitro can replace prop transport only, which means running both layers.

Record this as a decision with its reopening criteria so it stops being re-litigated.

---

## 6. soot conformance

soot ships a browser implementation of `@vxrn/native`'s native view seam at
`~/soot/packages/compat/src/stubs/native-seams/vxrn-native.tsx`, 369 lines, with
hand-copied prop type declarations, registered by component name through
`registerNativeComponentImplementation`. There is a Playwright conformance test at
`packages/sootsim-engine/test/kitchen-sink/integration/vxrn-native-toolbar.test.ts`.

Good news, and it corrects a concern I had: that seam is keyed on component name and
already resolves `codegenNativeComponent` components (soot does this for
`RNDateTimePicker` and `RNCPicker`). So one-native's Fabric components are interceptable
as-is. No blocker there.

The real cost is that every prop one-native adds is a second implementation in soot,
maintained by hand-copying types. one-native emits nothing machine-readable to conform
to. The manifest has enums, modifiers and constructors, not components and props, and
the public TS types are template literals.

So the normalized schema from section 1e should be a first-class emitted artifact:
components, props, types, enums, defaults, availability, slots, events, as JSON. TS
types, the Fabric spec and the payload converter all derive from it, and soot's
simulator consumes it to generate prop types and to fail its conformance test when
one-native adds a prop the simulator does not handle. That turns silent drift into a
red test, and it is the same artifact the plan's browser preview adapter needs later.

Also worth noting for soot: the flat data-payload menu is markedly easier to reimplement
in a browser than `@vxrn/native`'s React-children menu tree. That is a second argument
for the composition rule in section 2.

---

## 7. Smaller items, worth doing in the same wave

- **Web throws.** `src/index.ts` exports components that throw on render. `@vxrn/native`
  returns `null`. A component that hard-throws cannot be used in shared One code without
  a `Platform` check at every call site. Decide before the surface grows: I would render
  children for RN-hosting components, render nothing with a one-time dev warning for leaf
  controls, and keep throwing for nothing.
- **Throwing from render.** `Swift.Tabs` throws when `selection` does not name a mounted
  tab. During a transition where the tab list and the selection land in different commits
  that is an app crash on a legitimate intermediate state. Whatever you choose, choose it
  once, because every new control will copy the pattern.
- **Duplicated enforcement across two languages.** Four pairs: JS `pointerEvents="none"`
  plus Swift `isUserInteractionEnabled = false`; JS `accessibilityElementsHidden` plus
  Swift `accessibilityElementsHidden`; JS tab-type check plus native `NSAssert` (compiled
  out in release); JS single-child wrapper plus native `precondition` (a crash in
  release). Pick one owner for each. The native side should hold invariants JS cannot
  guarantee; JS should hold policy. I have not runtime-tested removing any of them, so
  verify each rather than deleting on my say-so.
- **Two owners for tab page geometry.** `PAGE_STYLE` sets absolute/100%/100% in JS while
  `OneNativeTabComponentDescriptor::adopt` sets size from state and forces
  `YGPositionTypeAbsolute`. One owner per axis is the plan's own rule.
- **Validation runs per parent render.** `Tabs`'s `useMemo([children])` and `Menu`'s
  `useMemo([items])` never hit when the parent builds those inline, which the shipped
  fixture does for both. Each parent render re-validates and re-flattens the whole tree in
  JS and re-parses every item through `fromRawValue` in C++. Fine at ten items, not fine
  at a picker's option list. The fix is the `__DEV__` gate plus the section 2 rule that
  large option lists belong to their own component, not to a menu payload.

---

## 8. Compositions that have not been exercised

The plan's validation section is honest about what was tested. Two compositions the next
wave will reach that nothing has exercised, and that I did not test either:

- `Swift.Tabs` nested inside a `Swift.Tab` page. `OneNativeHostingController.attach`
  walks the responder chain for a `UIViewController`; inside a SwiftUI slot that resolves
  to the outer hosting controller, so the inner tabs become its child. Plausible,
  unverified.
- Any second hosting controller presented outside the RN surface (a sheet or popover).
  That is the first case where the slot's coordinate and touch assumptions genuinely
  change, and it is the reason sheets should come after the slot unification, not before.

---

## 9. Ranked plan

**Must do before any new component**

1. Generator: type-qualified constructor keys, fail on ambiguity. (1a)
2. Generator: long-form availability, error on unparsed attributes, exclude deprecated. (1b)
3. Generator: `swiftc -typecheck` gate in `generate` and `generate:check`, and put
   `generate:check` in the macOS workflow. (1c)
4. One `OneNativeSlot` with explicit sizing, interaction and accessibility modes. (3a)
5. `OneNativeControlled` plus `useControlled`, with tabs and menu toggles ported onto it. (4)
6. Write down the composition rule and its escape hatch. (2)
7. Host-parameterized menu content emitters plus the equality helper. (3b)

**Same wave, cheap**

8. Type the catalog field lists, delete `constructors[]` and `modifiers[].default`,
   single source per default. (1d)
9. Coverage scope derived from the catalog. (1d)
10. Normalized schema JSON as a first-class output, derive TS/spec/converter from it,
    hand it to soot. (1e, 6)
11. Decide the web and unsupported-platform behavior. (7)
12. `__DEV__`-gate payload validation; stop throwing from render where a warning does. (7)

**Explicitly later**

- Content-sized boundaries and the threading seam (plan stage 2). Needed for sheets sized
  to content, not for controls. Do not let it block the control wave.
- Flat-prop modifier lowering order and `chain`. Do not build until three components want
  the same modifier.
- Nitro. Only against a named payload RN codegen cannot express.
- Browser preview adapter, after the schema JSON exists.
- Android and Compose.

---

## 10. Boundaries for the next API, and who does what

Target shape, so the mechanical work is genuinely mechanical:

```text
codegen/
  inventory.ts     stage 1: run Extract, filter, availability
  schema.ts        stage 2: the one normalized schema every emitter reads
  catalog/         policy per component family: menu.ts, tabs.ts, controls.ts
  emit/            ts-types, fabric-spec, payload, swift, manifest, schema-json
  verify.ts        swiftc -typecheck plus the regeneration check
src/controlled.ts  the ack protocol, shared by every control
ios/Slot/          one representable, three modes
ios/Binding/       OneNativeControlled
```

API shape the rule in section 2 produces:

```tsx
<Swift.Toggle isOn={on} onChange={setOn} label="Wi-Fi" systemImage="wifi" />
<Swift.Picker selection={id} onChange={setId} options={options} style="menu" />
<Swift.Menu items={items} onAction={run}>{trigger}</Swift.Menu>
<Swift.Toolbar items={[{ kind: 'menu', id: 'more', items }]} />
<Swift.Sheet isPresented={open} onDismiss={close}>{rnContent}</Swift.Sheet>
<Swift.RNView sizing="content">{rnContent}</Swift.RNView>
```

Ownership split:

- **Owner or an `lg` worker**: items 1 through 7. Generator correctness, the slot, the
  binding protocol, and the sheet presentation seam are all places where being wrong
  costs a cycle.
- **AGY / `md`**: once the schema and the component-view template are stable, one control
  family per task (catalog entry, component view from template, fixture screen, README).
  The `swiftc -typecheck` gate is the objective pass/fail, which is what makes this
  delegable at all. Also the soot simulator implementations, driven by the schema JSON.
- **Grok, strictly bounded**: single mechanical edits with the exact file named. Delete
  `modifiers[].default`. Type the catalog field lists. Add the equality-helper emitter.
  Three to five file operations each, no exploration.

Review disposition for that wave: one review from another model of the assembled
generator, slot and binding change, after it is assembled. Not per slice. Per-control
catalog additions afterwards get the compile gate and the fixture, no review.

---

## Evidence labels

- RAN: extractor output against iPhoneSimulator 26.4; the overload-ambiguity table; the
  102 zero-scored declarations; the recorded `Section 13` manifest entry; the four current
  modifiers each being unique on `View`; `operator==` being behind `RN_SERIALIZABLE_STATE`
  in the generated `Props.h`; Nitro absent from the repo; `generate:check` absent from CI;
  soot's seam files and its `codegenNativeComponent` resolution.
- TESTED: the `swiftc -typecheck` gate passing at exit 0 on the current tree, and failing
  at exit 1 with `extra argument 'bogusLabel'` on a deliberately broken signature.
- INFERRED: per-parent-render re-parse of menu items, from the generated `fromRawValue`
  plus React's shallow prop comparison.
- Unverified: Nitro's shadow-node and child-mount surface; the duplicated-enforcement
  removals in section 7; the nested-host compositions in section 8.
