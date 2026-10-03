# iOS 27 List search and refresh proof

`outcome.json` records 13 passing `list-search-refresh` checks. Four PNGs and
matching gzip-compressed AX JSON files record the initial, pending callback,
external search value, and native typed search states. `side-by-side.webp`
places the initial, external value, and typed states next to one another.

`environment.txt` records the suite source revision, the native iOS source
tree, Xcode and simulator version, and hashes of the code-bearing built and
installed `NativeFeatureTests.debug.dylib`. The hashes match. It also records
the built `libOne.a` hash. The native binary was reused from the earlier
List/Section run because `packages/one/ios` has the same Git tree at both
revisions. `native-build-reused-xcodebuild.log.gz` is that build's compressed
Xcode log.

The suite proves native pull gestures invoke the JS callback, a second pull
invokes it after the first callback's promise is resolved, and both directions
of the controlled search binding update the native field and React rows. It
does not measure the refresh indicator's duration. The native search field
appeared with `searchable` on the surrounding `NavigationStack`; a standalone
List host did not present one in this run.
