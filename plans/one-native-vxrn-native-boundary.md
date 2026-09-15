# Consolidate One Native in @vxrn/native

Ship the generated SwiftUI and Jetpack Compose surfaces from the existing
`@vxrn/native` package. There is no technical boundary that requires a second npm
package. Both implementations already use React Native autolinking, and one pod and
one Android package can register the existing platform interfaces beside the new
Fabric components.

The former package split protected two compatibility differences: `@vxrn/native`
supported older React Native releases and an iOS 15.1 deployment target, while the
generated SwiftUI surface requires React Native 0.86.2, New Architecture, and iOS 26.
Consolidation deliberately makes those requirements apply to the whole package.

## Capability ownership

| Capability | Runtime owner | Public surface |
| --- | --- | --- |
| Application route tabs and stacks | One through React Navigation | One router APIs |
| Explicit SwiftUI controls, containers, tabs, and presentations | Generated Fabric components | `@vxrn/native`'s `Swift` export |
| Jetpack Compose controls and containers | `OneNativeComposeNodeManager` | `@vxrn/native`'s `Compose` export |
| UIKit zoom, toolbar, and toolbar menu items | Existing `VxrnNative` managers | `@vxrn/native` direct and subpath exports |
| Split view | Existing `VxrnNative` implementation | `@vxrn/native/split-view` |
| Platform colors | Existing iOS and Android modules | `@vxrn/native/color` |

`Swift.Menu` and `MenuAction` remain different controls. `Swift.Menu` renders a
standalone SwiftUI menu. `MenuAction` describes a child of the navigation
controller's bottom toolbar menu.

One's routed tabs and `Swift.Tabs` also keep separate state. React Navigation is the
application navigator. `Swift.Tabs` is a low-level SwiftUI `TabView` for explicit
composition and controlled local selection. It does not register routes, mirror
history, or replace back behavior.

## Package shape

- `packages/native/package.json` owns the single `OneNativeSpec` codegen config and
  exports the platform-safe JavaScript entry points.
- `VxrnNative.podspec` compiles the existing UIKit sources, generated Fabric
  component views, authored SwiftUI runtime, and C++ shadow nodes in one static
  framework. Its deployment target comes from `schema.json`.
- `VxrnNativePackage` keeps the existing Android module and registers
  `OneNativeComposeNodeManager` from the same autolinked package.
- The browser entry preserves the existing web-safe extras and exposes unsupported
  `Swift` and `Compose` implementations that fail when rendered.
- `react-native-screens` and `react-native-safe-area-context` remain peers for
  SplitView. React and React Native use the stricter generated-surface versions.

## Consequences

- Consumers install and import only `@vxrn/native`; the `one-native` workspace and
  npm package no longer exist.
- The package's iOS deployment floor is 26 and its React Native peer is 0.86.2.
- Native ABI names such as `OneNativeSpec`, `OneNativeTabs`, and
  `OneNativeComposeNode` stay unchanged. The fold changes package ownership, not
  component identity.
- One's removed stack-toolbar adapter stays removed. Consolidating packages does not
  move route state into the native component library.

The fold must be validated as one artifact: generated SDK checks, TypeScript, unit
tests, package build, package contents, Android registration/build, and an iOS
consumer build all need to cover the combined package.
