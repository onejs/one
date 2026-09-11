# Where UIKit beats SwiftUI for One Native

A survey of the stack for places a UIKit view would serve us better than SwiftUI.
Everything here is checked against the iOS 26.4 simulator SDK
(`iPhoneSimulator26.4.sdk`), not recalled.

## The headline: most of the "needs UIKit" list is SwiftUI we cannot see

`codegen/inventory.ts:42` parses exactly two interface files:

```ts
const paths = ['SwiftUI', 'SwiftUICore'].map((module) => ...)
```

The SDK ships **23 more** `_<Framework>_SwiftUI.framework` overlay modules, each
with a `.swiftinterface` at the identical path layout, holding 616 public
declarations between them. The generator has never looked at one.

I ran the existing cached extractor against four of them with no changes at all:

```
_AVKit_SwiftUI         10 decls     struct VideoPlayer + inits
_WebKit_SwiftUI        37 decls     struct WebView + inits + 10 modifiers
_QuickLook_SwiftUI      2 decls     quickLookPreview x2
_PhotosUI_SwiftUI      55 decls     PhotosPicker + styles + selection behavior
```

The shapes come back exactly as the catalog selectors already expect. So video,
web, Quick Look, photo picking and maps are not UIKit questions. They are a
module-path list that needs three more entries. That is the cheapest large win
available and it needs no new architecture.

Ranked by declarations, the overlay modules are: StoreKit 160, MapKit 144,
RealityKit 94, AppIntents 35, PassKit 33, DeviceActivity 27,
AuthenticationServices 24, PhotosUI 23, WebKit 18, SwiftData 11, MusicKit 8,
then thirteen more in single digits.

## A. What SwiftUI genuinely lacks

Each of these returned zero across all 25 interface files, with `MagnifyGesture`,
`quickLookPreview` and `struct WebView` as positive controls in the same run so
the greps were provably live.

### 1. Pinch-to-zoom scroll (high value, low cost)

`ScrollView` has two initializers and neither takes a zoom parameter. The only
magnification surfaces in the whole SDK are `MagnifyGesture` (a gesture, it does
not move a scroll view's content offset), `webViewMagnificationGestures` (WebKit
only) and `accessibilityZoomAction` (an assistive affordance). There is no
`zoomScale`, no `maximumZoomScale`, no `viewForZooming`.

Rebuilding this on `MagnifyGesture` means reimplementing zoom-anchored content
offset, pan-after-zoom, rubber-banding at the scale limits and double-tap-to-zoom.
That is the entire reason `UIScrollView`'s zoom behaves right and a hand-rolled
one does not, and it is exactly the Galleria failure: a very long image that
refused to zoom past a point and snapped back. That snap-back is a content-size
and `maximumZoomScale` interaction that `UIScrollView` gets right for free.

Cost is one `UIView` subclass holding a `UIScrollView` with a single image child
and `viewForZooming:`. No codegen, no schema, no shadow node beyond what
`OneNativeMeasuredHeight` already does.

### 2. Zoom navigation transition from a React Native thumbnail (high value, medium cost)

SwiftUI has the transition: `navigationTransition(.zoom(sourceID:in:))` plus
`matchedTransitionSource(id:in:)`. Both halves need the same
`SwiftUICore.Namespace.ID`, which means both halves must live in one SwiftUI
tree. A thumbnail in a React Native `FlatList` cannot be a transition source, so
the modifier is unreachable for the case we actually have.

UIKit's version does not need a shared namespace:
`UIViewController.preferredTransition` takes a `UIViewControllerTransition`
(iOS 18, `UIViewController.h:284`), and the zoom variant takes a closure
returning the source view. Any `UIView` can be that source, including one React
Native laid out.

Pairs with #1. Together they are the native photo gallery, which is the concrete
thing this stack is missing.

### 3. PDF (medium value, low cost)

Zero hits for `PDFView` or `PDFDocument` anywhere in SwiftUI. `PDFKit` is present
in the SDK. `PDFView` is a `UIView` with a document property, so wrapping it is
close to trivial. Real demand, narrower than the gallery.

Note that `quickLookPreview` (iOS 14, `_QuickLook_SwiftUI`) already covers
"preview a file the user tapped", which is most of what people reach for PDFKit
to do. Only take PDFKit when the app needs inline paging, text selection or
annotation inside its own layout.

### 4. Camera preview (low priority despite zero coverage)

No `AVCaptureVideoPreviewLayer`, no camera view of any kind in SwiftUI.
`_AVKit_SwiftUI` gives `VideoPlayer` for playback and `onCameraCaptureEvent` for
hardware shutter buttons, and stops there.

I would not build this. A preview layer is the small visible part of a capture
session, device discovery, orientation, permissions and photo output lifecycle.
expo-camera already carries all of it. The cost is not the `UIView`.

### 5. Live Photo display (low priority)

`_PhotosUI_SwiftUI` mentions `PHLivePhoto` once and only to declare a
`CoreTransferable.Transferable` conformance. There is no view. Playing a Live
Photo needs `PHLivePhotoView` from UIKit. Niche, but genuinely absent, and cheap
if it ever comes up.

## B. Things I checked that do NOT need UIKit

Worth recording because two of these I got wrong first by grepping for the UIKit
spelling instead of the SwiftUI one, which is the mistake this whole pass is
about:

- **Keyboard accessory toolbar.** `ToolbarItemPlacement.keyboard` exists. I first
  searched `inputAccessoryView` and got zero, which proved nothing.
- **Text selection.** `TextSelection`, `AttributedTextSelection`,
  `TextField(selection:)` and `searchSelection` all exist. I first searched
  `selectedTextRange`.
- Pull to refresh (`refreshable`), search (`searchable`), context menus, drag and
  drop (`draggable` / `dropDestination`), haptics (`sensoryFeedback`), paging
  (`PageTabViewStyle`), `Canvas`, `TimelineView`, `MeshGradient`, `glassEffect`,
  `scrollTargetBehavior`, `containerRelativeFrame`, `onScrollGeometryChange`,
  `TextEditor`, `AttributedString`, focus state. All present.

## C. What the escape hatch should look like

Section A is short enough that it does not justify a general UIKit-wrapping
subsystem. Four hand-written views over the life of the project is not a code
generator's problem.

The composition contract already handles this. `OneNativeContainerSlotView`
(public name `Swift.Slot`) is a `UIView` conforming to `OneNativeComposable`
whose SwiftUI content is a `UIViewRepresentable`-shaped bridge. A UIKit control
is the same thing pointed the other way: a hand-written `UIView` conforming to
`OneNativeComposable`, publishing its content like any generated control, and
reporting height through `OneNativeMeasuredHeight`. It inherits recycling,
accessibility forwarding and Yoga measurement without a single new concept.

So the rule is: generated controls come from the SDK interfaces, hand-written
controls live beside them in `ios/` and conform to the same protocol. No
`interfaceOnly` special case, no second pipeline.

## Recommended order

1. Add the overlay module paths to `inventory.ts`. Largest surface gain per line
   changed, and it settles video, web, Quick Look, photo picker and maps at once.
2. Zoomable image view (UIKit). Directly fixes a pain point we have hit.
3. Zoom navigation transition (UIKit, iOS 18). Completes the gallery.
4. PDF, only if an app asks and `quickLookPreview` is not enough.
5. Skip camera preview and Live Photo until something needs them.

## Corrections to earlier claims

- I said `quickLookPreview` was macOS only. It is iOS 14+, in
  `_QuickLook_SwiftUI`. I had grepped only the main SwiftUI interface.
- I said the overlay modules held 1,497 declarations. That was a loose line
  count. A strict count of public `struct`/`func`/`init`/`enum`/`protocol`
  declarations gives 616 across 23 modules.
- I listed Live Photo as absent, then as present, then as absent. Final answer:
  the view is absent, only a `Transferable` conformance ships.
