Bounded read-only investigation. Report findings to your parent session and stop. Do not edit any file, do not commit, do not spawn.

CONTEXT
`one-native` is a new package at /Users/n8/.worktrees/one-native/packages/one-native. It generates SwiftUI bindings for React Native Fabric components (OneNativeMenu, OneNativeTabs, OneNativePicker, OneNativeToggle, OneNativeSheet, etc.) and exports a machine-readable description of every component at packages/one-native/schema.json (components with props/events/slots, payload shapes, enums, and a controlledProtocol block).

The goal I am evaluating is: let Soot (the browser runtime at ~/soot) render these same components on the web by consuming schema.json, rather than hand-writing a parallel implementation.

QUESTION
Exactly how does Soot's existing native-seam mechanism intercept a React Native / Fabric component by name, and what would consuming schema.json require?

WHAT TO READ (start here, do not crawl the whole repo)
1. ~/soot/packages/compat/src/stubs/native-seams/vxrn-native.tsx  (the existing seam for the package one-native is meant to replace)
2. ~/soot/packages/compat/src/stubs/native-seams/_native-seam-helpers.ts
3. Whatever registry/index file maps a module specifier or component name to those seam files (find it by grepping for "native-seams" in ~/soot/packages, pruning node_modules).
4. One or two seams that wrap a real Fabric/codegen component with props+events, for the shape (react-native-picker.tsx and react-native-segmented-control.ts look relevant).
5. /Users/n8/.worktrees/one-native/packages/one-native/schema.json (read it fully; it is ~12KB).

REPORT BACK, with file:line for every claim
A. The seam mechanism: is interception keyed on the npm module specifier, the Fabric native component name registered via codegenNativeComponent, or something else? Show the code that does it.
B. What a seam module must export and what contract it must satisfy (props in, events out, refs, measurement).
C. How events are shaped on the Soot side compared with React Native's DirectEventHandler `{ nativeEvent }` convention.
D. Whether anything in Soot already reads a generated schema/manifest to produce components or types, or whether every seam is hand-written. If something exists, name it with paths.
E. Given schema.json's component/props/events/slots/enums shape, the concrete gaps: what information does a Soot implementation need that schema.json does NOT currently carry? Be specific (for example: default values, which props are required, layout/intrinsic sizing, the meaning of a slot's `layout` field, accessibility semantics).
F. Whether `@vxrn/native` is referenced anywhere else in ~/soot besides that one seam file.

RULES
- Label every causal claim: RAN / TESTED / INFERRED / GUESSED. Absence of a grep hit proves little; say what you searched.
- Never search ~, ~/.worktrees, or ~/github. Prune node_modules.
- Do not propose an implementation plan. I want the mechanism and the gaps, with paths.
- You do NOT own: any edit to soot or one-native, any commit, any design decision, any review.

REVIEW: none
