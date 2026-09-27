# iOS 27 ScrollView search and refresh proof

`outcome.json` records 13 passing `scroll-search-refresh` checks. Four PNGs
and matching gzip-compressed AX JSON files capture the initial, pending
callback, external search value, and native typed search states.
`side-by-side.webp` shows the initial, external value, and typed states.

`environment.txt` records suite source `a6c29f54f`, the native iOS tree,
Xcode and simulator versions, and matching hashes of the code-bearing built
and installed `NativeFeatureTests.debug.dylib`. The unchanged native tree was
built earlier at `db32abfd6`; the build log is preserved at
`../list-search-refresh/native-build-reused-xcodebuild.log.gz`. The receipt
also records the built `libOne.a` hash.

The suite proves two native pull gestures invoke the JS callback and the
second occurs after the first callback's promise resolves. It proves native
search typing and external React updates change the native field and filtered
scroll content. It does not measure the refresh indicator's duration or test
horizontal and both-axis ScrollViews.
