# Keep @vxrn/native separate from one-native

Keep the packages separate. They have different renderers, platform reach,
deployment floors, and capability owners. The V2 integration removes overlapping
route-navigation surfaces without deleting independent SwiftUI primitives.

This conclusion was verified on the handed-off `feat/one-native` commit
`a45ff3ac48d137c48a3077ba16c8a161762dd620` and then reconciled with the
React Navigation 8 integration.

## Current ownership

| Capability                                             | Owner                          | Reason                                                                    |
| ------------------------------------------------------ | ------------------------------ | ------------------------------------------------------------------------- |
| Application route tabs and stacks                      | React Navigation 8 through One | Owns routes, links, history, back behavior, and route selection            |
| Explicit SwiftUI TabView and Tab primitives            | `one-native`                   | Local non-router composition and controlled selection                     |
| UIKit zoom transitions                                 | `@vxrn/native`                 | Uses the navigation controller and supports the older iOS floor           |
| Bottom toolbar and toolbar menu items                  | `@vxrn/native`                 | Uses `UINavigationController` and Paper view managers                     |
| Split view                                             | `@vxrn/native`                 | Uses react-native-screens and preserves its Android/web fallback behavior |
| Platform colors                                        | `@vxrn/native`                 | Resolves iOS and Android system colors and stays safe on web              |
| Other SwiftUI controls, containers, and presentations  | `one-native`                   | Generated Fabric components with an iOS 26 floor                          |

`Swift.Menu` and `@vxrn/native`'s `MenuAction` are not duplicate
implementations. The former renders a standalone SwiftUI menu. The latter
describes children of the navigation controller's bottom toolbar menu.

Likewise, One's React Navigation tabs and `Swift.Tabs` do not share route state.
React Navigation is the only application navigator. `Swift.Tabs` exposes a
low-level SwiftUI `TabView` for explicit non-router composition, with local
controlled selection. It does not register with One, wrap React Navigation, or
mirror route history. A childless action `Swift.Tab` emits an application callback
without entering the selection protocol; the application decides what to present.

## Evidence

- `@vxrn/native` uses `RCTViewManager` Paper components for toolbar and zoom.
  It also ships an Android Material color module and web-safe JavaScript entries.
- `one-native` uses generated Fabric specs, component descriptors, and
  `RCTViewComponentView` subclasses. It ships no Android implementation.
- `packages/native/VxrnNative.podspec` targets iOS 15.1.
  `packages/one-native/OneNative.podspec` reads iOS 26 from the generated schema.
- `one-native` has no runtime dependencies and peers only on React and React
  Native. Its tab primitive therefore cannot introduce a second One or React
  Navigation route model. `@vxrn/native` retains the screens and safe-area peers
  required by SplitView.
- `Color` has Android behavior and a web-safe proxy, so an iOS-only SwiftUI
  package cannot own it without dropping supported platforms.
- ToolbarHost, ToolbarItem, MenuAction, SplitView, and the zoom components have
  no equivalent in React Navigation 8 or `one-native`.

## V2 resolution

- Removed One's StackToolbar registry, public API, adapter, tests, declarations,
  and documentation.
- Kept ToolbarHost, ToolbarItem, and MenuAction as direct `@vxrn/native`
  capabilities. They no longer depend on One or React Navigation.
- Kept zoom, SplitView, and Color in `@vxrn/native`.
- Kept `Swift.Tabs` and `Swift.Tab` as explicit SwiftUI primitives, including the
  detached childless action path. They are not One layout exports and do not own
  application routes.
- Kept `Swift.Menu` as a standalone SwiftUI control rather than a navigation
  adapter.

Move a capability later only when runtime evidence shows that its existing
platform behavior can be preserved by the new owner. Similar export names are
not enough.
