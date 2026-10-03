# One.UI.Portal and One.UI.Pager

Two uniform components that retire `react-native-teleport` and
`react-native-pager-view` in One apps. Nate approved this surface on
2026-10-02; they are on v2-beta from 2.0.0-beta.163.1.

With One.Storage (landed, retires `react-native-mmkv`) and `useHeaderHeight`
from `one` (landed, retires the direct `@react-navigation/elements` import),
these finish the four replacements.

## One.UI.Portal, One.UI.PortalHost

Shape: react-native-teleport 1.2, whose native side is already two Fabric host
views and whose native `PortalProvider` renders its children unchanged. One
drops the provider.

```tsx
import { One } from 'one'

<One.UI.PortalHost name="overlay" style={StyleSheet.absoluteFill} />

<One.UI.Portal hostName="overlay" name="status">
  <StatusBadge />
</One.UI.Portal>
```

| member | props | behavior |
| --- | --- | --- |
| `Portal` | `hostName?: string`, `name?: string`, `style?`, `children` | with `hostName`, its children mount natively inside the named host and keep their React tree (context, state, events stay in place); without one, they render where the Portal is. `name` keys a portal so a second Portal with the same name replaces the first |
| `PortalHost` | `name: string`, `style?`, `children?` | a view that receives the children of every Portal naming it, in mount order, above its own children |

- Native: iOS `OneNativePortalView` and `OneNativePortalHostView` (Fabric,
  Objective-C++), Android the same pair in Kotlin, one registry per process
  keyed by host name. A Portal that names a host not yet mounted waits and
  moves in when the host mounts; a host that unmounts returns its portals to
  their own position.
- Children lay out against the host's size, never the window's.
- Web: `createPortal` into the host's element, from a module registry with no
  provider.
- Tamagui: `@tamagui/native/setup-teleport` points at these components; its
  call shape does not change.

## One.UI.Pager

Shape: react-native-pager-view 8, whose props, events and methods the
Develop tab and every pager-view app already use. Pages are ordinary React
Native views, one per direct child. It is the uniform pager; `One.iOS.Pager`
stays the SwiftUI `TabView` page style with `Swift.Page` children.

```tsx
import { One, type PagerRef } from 'one'

const pager = useRef<PagerRef>(null)

<One.UI.Pager
  ref={pager}
  initialPage={0}
  onPageScroll={({ nativeEvent }) => progress.set(nativeEvent.position + nativeEvent.offset)}
  onPageSelected={({ nativeEvent }) => setPage(nativeEvent.position)}
>
  <ProjectsPage />
  <ChatPage />
</One.UI.Pager>

pager.current?.setPage(1)
```

| member | type |
| --- | --- |
| `initialPage` | `number`, default 0 |
| `scrollEnabled` | `boolean`, default true |
| `orientation` | `'horizontal' \| 'vertical'`, default horizontal |
| `layoutDirection` | `'ltr' \| 'rtl'`, default ltr |
| `offscreenPageLimit` | `number`, Android |
| `pageMargin` | `number` |
| `overdrag` | `boolean`, default false, iOS |
| `overScrollMode` | `'auto' \| 'always' \| 'never'`, Android |
| `keyboardDismissMode` | `'none' \| 'on-drag'` |
| `onPageScroll` | `{ position, offset }`, every frame of a drag or settle |
| `onPageSelected` | `{ position }` |
| `onPageScrollStateChanged` | `{ pageScrollState: 'idle' \| 'dragging' \| 'settling' }` |
| ref | `setPage(index)`, `setPageWithoutAnimation(index)`, `setScrollEnabled(enabled)` |

- Native: iOS a paging `UIScrollView` (one page per child, no
  `UICollectionView` and none of the keyboard-avoidance and cell-reuse patches
  pager-view needs); Android `ViewPager2` over the existing children.
- Web: a scroll-snap container with the same events and ref.
- Speed: `onPageScroll` delivered per frame with no extra JS frames, measured
  against pager-view on device per section 4 of the conventions.

## Proof

- RAN, iOS 27 simulator (iPhone 17 Pro, Release build): `--suite portal`
  passes; `--suite pager` passes all 21 checks. A drag that starts on a page's
  text input pages neither One.UI.Pager nor pager-view 8.0.5, so the suite
  drags above it.
- RAN, Android emulator (`android_lane_pixel_8`, debug build with Metro):
  `--suite portal` 11 checks and `--suite pager` 10 checks pass.
- Peach seams and library cases exist in Contrast
  (`OnePortalLibraryCase`, `OneUIPagerLibraryCase`); their comparison against
  iOS captures is still to run.
- Contrast main carries One 2.0.0-beta.163.1 and Tamagui
  3.0.0-beta.1562.1 with `setup-one-portal`; react-native-teleport and
  react-native-pager-view left contrast-mobile (OTA runtime 80).
