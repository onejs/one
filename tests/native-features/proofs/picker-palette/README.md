# iOS 27 Picker palette outside Menu

`outcome.json` records nine passing `picker-palette` checks. Three screenshots
and matching compressed accessibility trees capture initial selection, a native
tap on Beta, and an external React selection of Gamma followed by an independent
tap on the segmented reference. `side-by-side.webp` presents those states.
The fixture omits a width style on both controls. `measurements.json`,
extracted from the initial accessibility tree, records 362 × 31 point frames
for each native TabGroup. The 50 point host height is the only picker style.

The simulator was an iPhone 17 Pro on iOS 27.0 with Xcode 27.1. The app used a
previously built native binary: `environment.txt` records matching hashes for
its built and installed code-bearing debug dylib and the `libOne.a` archive.
Both Picker Swift source blobs are identical at the earlier native build
revision and the suite source revision. The generated JavaScript Picker control
was rebuilt for this suite, and its source blob and output hash are recorded.

The suite proves the standalone palette Picker presents the same native
segmented structure and geometry as an explicit segmented Picker, and that
native taps and external React updates drive its controlled selection. A Picker
embedded in Menu content, `navigationLink` presentation, and earlier iOS
presentations remain unproven.
