# Generated SDK linkage assets

The iOS 27.1 assets were regenerated with reviewed source
`087704d2cabf9082f1dd4f7dd8b350c5a95adc50`, tree
`2e6b05c055623214f9147b898a6ddf6701618303`. Its full generator fingerprint is
`3864e7f38681b8753066dde1cf66dca12a9c74b04c0538f49ff3b586cdfc963e`.
The manifest, runtime facades and native table names use generation
`3864e7f38681b875`.

The supported `bun run generate:ios-types` completed all 290 frameworks in
816.9 seconds, including the generator's individual device and simulator SIL
checks. It emitted 290 runtime facades, 290 declarations and matching native
tables and metadata. No generated table was copied from an earlier generation
or given a replacement generation name.

## Coverage

Compared with the committed `e11dfd5beee01da3` generation, all 132,729 remaining
entries retain their complete metadata and callable IDs. The only removed
entries are the approved iOS-unavailable ColorSync global accessors:

| Entry | Callable ID |
| --- | --- |
| `c:@kColorSyncPreferredCMM:get` | `3018449090139855` |
| `c:@kColorSyncPreferredCMM:set` | `3883643562784605` |

ColorSync changes from 391 to 389 entries. Its one additional skip records the
original header's iOS unavailability. All other framework entry metadata,
skips and referenced-module lists remain unchanged. The complete generation
contains 18,270 skips, retaining their actual reasons.

AVKit remains at 192 entries, including initializer `4149603380729748` for
`AVCaptureDeviceDirectionCoordinator.init(view:deviceTypes:changeHandler:)`.
CoreData retains all 1,156 entries, including callable `231231335522069` for
the managed-object string subscript. Its generated body calls the public
`value(forKey:)` accessor with the reviewed native getter operation and bridging.
The source qualification and runtime proof are described in
[sdk-native-linkage.md](sdk-native-linkage.md). No entry signature or ID changes.

All 19 original C helpers in CarPlay, GameController, AVFoundation and
AuthenticationServices remain present by their native C identities. The
existing App Store type exclusions remain unchanged.

The earlier API-notes-only policy produced an additional AVKit compiler
rejection. That output was held and preserved as diagnostic evidence. Restoring
the original SDK umbrella's header ownership preserves the initializer without
changing its emitted expression or excluding another API. The failed output
was not committed.

## Package and native policy qualification

The 15-package local family was first built through `bun release --into` in an
isolated disposable consumer. After the source corrections, only One required
a rebuild. The other 14 packages retained identical source and installed file
hashes. The final supported `bun release --into <consumer> --skip-build` repacked
those current outputs together with the freshly generated assets. This local
family reports version 2.9.0; it is not a published npm pin.

The installed `dist/sdk/app.mjs` helper returns the same generation as all 290
facades and cached Swift tables. Its complete flags and modulemap bytes match
the reviewed source for both selected SDKs. Consumers must pass their selected
SDK root to `writeSdkNativeSupport(freshSupportDirectory, sdkRoot)` and append
the returned flags unchanged. The flags retain C++ interop's external modulemap
and the original SDK API-notes search paths. The maps retain original SDK
umbrella ownership. Generated pods select their maps by `PLATFORM_NAME` and
SDK paths by `SDKROOT`, keeping the framework tables together in one pod.

The existing constants capture selector measures 11,122 inputs across 126
frameworks in the installed fresh facades. Their names and IDs match the
committed baseline. That selector does not include the removed ColorSync
accessor object, so removing those two accessors does not reduce its input
count. This measurement does not claim a successful combined native capture.

Source archives, the generated diff, complete per-framework metadata and skip
reasons, immutable native cache copies, package file hashes and the measured
constant inventory were retained for the delivery owner. The combined constants
oracle, native application acceptance, engine preparation and a published
whole-family pin remain separate delivery checks.

## Historical fixture boundaries

The CI owner reported these failures from earlier source generations. They are
separate from the locally qualified `3864e7f38681b875` candidate:

| Source | CI run | Committed UIKit namespace | Reported boundary |
| --- | --- | --- | --- |
| `7cda019211` | `39743906191` | `UIKit_c1f28409f8601238` | Basic starter prebuild generation mismatch; native table not linked |
| `aba9107c9e` | `39748432045` | `UIKit_e11dfd5beee01da3` | Basic starter prebuild generation mismatch; native `RCTFatal` for callable `1668503762645542`, table not linked |

Each reported UIKit namespace matches that source's committed facades. On
`aba9107c9e`, the actual source generator instead identifies as
`46a919af85550f5c`, establishing the separate prebuild mismatch. Callable
`1668503762645542` retains identical metadata in the fresh generation.

Matching a facade namespace does not establish that its native table was
registered in the fixture application. These historical fixture failures are
not failures of the fresh candidate, do not identify the browser constants
failure's cause and are not separate failures of each package in the family.
No additional native application producer or fixture rerun was started for
this generated unit.
