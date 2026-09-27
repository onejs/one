# iOS 27 horizontal safe-area inset proof

`outcome.json` records nine passing `horizontal-inset` checks. Two PNGs and
matching compressed accessibility trees capture the initial layout and both
native button taps. `side-by-side.webp` shows both states. The fixture uses
280 × 180 point hosts for the leading and trailing variants.

`measurements.json` was extracted from the initial AX tree. The leading inset
action ends eight points before its base begins, and the trailing action begins
eight points after its base ends. Both actions and both bases stay inside their
own hosts. The suite also proves each button reaches its React handler.

`environment.txt` records the suite source, iPhone 17 Pro / iOS 27.0 runtime,
Xcode 27.1, matching source blobs for the generated ViewSlot and native Overlay
host at the earlier binary build revision, and matching built/installed hashes
of the code-bearing debug dylib. This proof covers bounded hosts; behavior
inside scroll content or at other container sizes is unproven.

The reused native build log is preserved at
`../list-search-refresh/native-build-reused-xcodebuild.log.gz`.
