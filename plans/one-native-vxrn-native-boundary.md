# Keep @vxrn/native separate from one-native

**Recommendation: keep the two packages separate.** Absorbing `@vxrn/native` into
`packages/one-native` would give a package that today has zero dependencies a hard peer
dependency on `one` itself, on react-navigation, and on react-native-screens, and would move
Paper view managers and an Android module into a Fabric, iOS-26, iOS-only package. Migrate
feature by feature later if it is ever justified, and only by caller behavior.

Written for the v2-beta owner integrating `feat/one-native` with
`feat/react-navigation-v8-main`. No branches merged, nothing published or tagged.

## The evidence

**RAN** - every claim below is a file I read in this checkout, cited by path.

1. **Different renderer generation.** `@vxrn/native` is Paper. `ios/Toolbar/VxrnToolbarHostManager.m`
   is an `RCTViewManager` with `RCT_EXPORT_MODULE`, and a search for `codegenNativeComponent`,
   `RCTViewComponentView` and `ComponentDescriptor` across `packages/native/src` and
   `packages/native/ios` returns nothing. `one-native` is Fabric throughout: codegen specs in
   `src/specs/`, `RCTViewComponentView` subclasses, generated component descriptors.
   Absorbing means rewriting all six feature areas on Fabric, not moving files.

2. **Different iOS floors.** `VxrnNative.podspec` sets `:ios => '15.1'` and depends only on
   `React-Core`. `OneNative.podspec` reads its floor from `schema.json`, which `codegen/generate.ts`
   sets to 26. The floor was raised to 26 specifically so availability branches could be deleted.
   Hosting a 15.1 Paper surface inside it undoes that.

3. **Different platform reach.** `@vxrn/native` ships an Android module
   (`android/src/main/java/dev/vxrn/nativebridge/VxrnNativeModule.kt`, Material 3 color
   resolution) and web-safe fallbacks (`src/color/index.ts` returns null through a Proxy on
   web/SSR). `one-native` is iOS-only and its web entry throws on render. `Color` in particular
   is a cross-platform token API with no SwiftUI involvement at all; moving it into an iOS-only
   package makes it unusable on the two platforms it already serves.

4. **Dependency direction is the opposite.** `packages/one-native/package.json` has
   `dependencies: {}` and peers only `react` and `react-native`.
   `packages/native/package.json` peers on `@react-navigation/native` ~7.3.16,
   `@react-navigation/native-stack` ~7.18.8, `one` 1.26.0, `react-native-screens` >=4.0.0 and
   `react-native-safe-area-context` >=5.4.0. Merging them makes `one-native` depend on `one`,
   which is circular, and pins a standalone bindings package to a navigation library.

5. **One already owns the StackToolbar API; `@vxrn/native` is only its iOS backend.**
   `packages/one/src/stack-toolbar-implementation.ts` and
   `packages/one/src/layouts/stack-utils/StackToolbarImplementation.tsx` define the public
   components and a registry. `packages/native/src/StackToolbarImplementation.tsx` maps those
   children onto native components and calls `registerStackToolbarImplementation`, and
   `packages/native/src/index.ts` fires that registration as an import side effect. The owner of
   this API is One. Neither package should take it from One, and
   `plans/one-native-navigation-design.md` independently recommends One's native stack stay the
   sole navigation owner.

6. **Soot integrates `@vxrn/native` by package name.**
   `~/soot/packages/compat/src/native-seam-loaders.ts:37` maps the specifier `'@vxrn/native'` to
   a register stub, and `~/soot/packages/compat/src/registry.ts:4479` records it as a supported
   native package. Renaming or folding the package breaks that seam by name.

7. **react-navigation coupling lives entirely on the `@vxrn/native` side.**
   `packages/native/src/stack-toolbar/StackToolbar.tsx` imports `NativeStackHeaderItem`,
   `NativeStackNavigationOptions` and friends from `@react-navigation/native-stack` and
   `useNavigation` from `@react-navigation/native`. `one-native` imports neither. This matters
   most for the v8 integration: `@vxrn/native` is precisely the package that has to move with
   react-navigation, and `one-native` is precisely the one that must not be dragged along.

## What overlaps, honestly

Almost nothing at the implementation level. The overlap people see is export-name similarity.

| `@vxrn/native` | `one-native` | Real relationship |
| --- | --- | --- |
| `StackToolbar` | `Swift.Menu`, `Swift.Tabs` | None. StackToolbar writes react-navigation header options; one-native renders SwiftUI inside a Fabric view. |
| `MenuAction` | `Swift.Menu` | Same idea, different host. MenuAction feeds native-stack header menus; `Swift.Menu` is a standalone SwiftUI menu with a generated validator. |
| `ToolbarHost`, `ToolbarItem` | no equivalent | None. These are StackToolbar's internal building blocks. |
| `SplitView` | no equivalent | None. `NavigationSplitView` is explicitly excluded by the navigation design. |
| `ZoomTransition*` | no equivalent | None. UIKit `preferredTransition = .zoom` against a navigation controller. |
| `Color` | `swiftStyle` colors | Adjacent, not overlapping. `Color` resolves platform tokens on iOS and Android; `swiftStyle` sets SwiftUI colors on a generated control. |

## What can change now

- **Delete three public exports, keep the code.** `ToolbarHost`, `ToolbarItem` and
  `ZoomTransitionAlignmentRectDetector` have no importer in this repo outside
  `packages/native` itself, and `StackToolbar.tsx` uses `ToolbarHost`/`ToolbarItem`/`MenuAction`
  internally (`packages/native/src/stack-toolbar/StackToolbar.tsx:26-27`). So the exports are
  surface with no callers, and the modules stay. `ZoomTransitionAlignmentRectDetector` has no
  caller at all, internal or external.
  Check downstream consumers before cutting: this is a published package, and absence of a
  caller in this checkout does not prove absence in someone's app.
- **Nothing to move into `one-native`.** Every feature is either navigation-owned, Android and
  web bearing, or Paper.
- **Leave `Color` where it is.** It is the one piece that is genuinely portable, and it is the
  one piece `one-native` could never host.

## What a later migration would actually cost

Only worth doing per feature, when that feature has a reason to become SwiftUI.

- `MenuAction` to `Swift.Menu`: the mechanism exists. The blocker is that native-stack header
  menus are positioned by react-navigation, so this is a navigation question, not a binding one.
- `SplitView` and `ZoomTransition`: a SwiftUI rewrite drops iOS 15.1 through 25 for those
  features and gains nothing until the app's floor is 26 too.
- `StackToolbar`: do not migrate. One owns the API, and the navigation design says binding
  SwiftUI navigation is gated behind a runtime experiment that has not been run.
- `Color`: never. It is cross-platform and would lose Android and web.

The migration cost is therefore not a file move. It is one Fabric rewrite per feature plus the
platform support each rewrite drops.
