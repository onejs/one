# iOS 27 horizontal safe-area bar proof

`outcome.json` records nine passing `horizontal-bar` checks. Two PNGs and
matching compressed accessibility trees capture the initial layout and both
native button taps. `side-by-side.webp` shows both states. The fixture uses
280 × 180 point hosts for the leading and trailing variants.

`measurements.json` comes from the initial AX tree. The leading action's right
edge and base's left edge differ by 0.17 point; the trailing base's right edge
and action's left edge differ by 0.17 point. The action is edge-adjacent on the
requested side; all elements stay inside their hosts. Both native buttons
reach their React handlers. This is the observed SwiftUI bar layout, with no
extra spacing supplied by One.

`environment.txt` records the suite source, iPhone 17 Pro / iOS 27.0 runtime,
Xcode 27.1, matching source blobs for the generated ViewSlot and native Overlay
host at the earlier binary build revision, and matching built/installed hashes
of the code-bearing debug dylib. The reused native build log is preserved at
`../list-search-refresh/native-build-reused-xcodebuild.log.gz`.
