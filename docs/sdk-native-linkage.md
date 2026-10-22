# SDK native linkage qualification

The iOS 27.1 constants capture reached native linking after passing source and
SIL compilation on source `162c8c314b`. Its 20 missing symbols have two causes.
This correction preserves the earlier collision, publisher and CoreNFC fixes
from PRs #1008, #1009 and #1010. Capture and driver diagnosis belongs to session
s65565; the bounded SDK controls and this source correction belong to s65726.

## C export linkage

TESTED: one Objective-C translation unit referencing all 19 helpers from
CarPlay, GameController, AVFoundation and AuthenticationServices links. The
same source compiled as Objective-C++20 fails with 19 C++ mangled references.
The SDK headers lack C linkage guards and their framework stubs export C names.
Direct Swift references reproduce that failure under C++20 interop and WMO.

The correction supplies portable Clang modulemaps marked `extern_c`. Their
headers import the original SDK umbrella headers, and their link directives
retain the original frameworks. There are no substitute declarations,
implementations, symbol aliases or SDK mutations. One writes these maps into
the generated pod, the generator's compiler work directory, or a caller's
fresh support directory. All generated framework tables remain in one module.

TESTED: all 19 references link together with the maps on device and simulator,
including explicit module builds. A simulator control also imports and links
the retained One runtime. The SDK warning about a macOS sysroot remains in
successful controls; it does not establish a cause for these failures.

## Native availability

TESTED: Objective-C rejects `kColorSyncPreferredCMM` as unavailable on iOS.
`ColorSyncTransform.h:220` declares it with `CS_UNAVAILABLE_EMBEDDED`.
`ColorSyncBase.h:79-106` maps that to iOS unavailability except when `__swift__`
is defined, when the macro is empty. Swift consequently accepts it and emits
a reference that cannot link. Both iOS SDK stubs lack its export; the macOS
stub exports it for macOS targets only.

The lane lead authorized following this objectively unavailable native
declaration. The bridge rejects its exact C identity with the native header
reason before emitting dispatch or TypeScript. No value or platform support
is invented. This is the only availability correction in this source unit.

TESTED: before/after emission against the same graphs and exclusions removes
only `c:@kColorSyncPreferredCMM:get` (3018449090139855) and
`c:@kColorSyncPreferredCMM:set` (3883643562784605). ColorSync changes from 391
to 389 entries. CarPlay, GameController, AVFoundation and AuthenticationServices
have no added, removed or changed entry metadata. The facade no longer exposes
the unavailable global. The expected constants capture input loses one global,
subject to the capture owner's actual regenerated input count.

## Consumer boundary and remaining acceptance

The SDK bundle exports `writeSdkNativeSupport(buildSupportDir)`, returning
`{ generation, swiftFlags }`. Consumers compare its generation with the cached
tables and append its flags unchanged. The helper writes `module.modulemap`
and header imports below the supplied directory. Its paths refer to that
directory, never an SDK installation or mutable generation cache. The generator
fingerprint includes the modulemap writer, so old caches cannot claim the new
policy's identity.

TESTED: 71 existing tests pass across deriveSDK, C sentinel handling,
fingerprinting and entry identity. No new tests or full capture were added.
Full command records, sources, compiler diagnostics, symbol output and the
coverage delta are retained outside the worktree in
`/Users/n8/.team-machine/evidence/one-sdk-native-linkage-s65726`.

The parent owns source review and coherent package qualification. The capture
owner must migrate its compiler boundary to the exported helper and run the
sole combined constants oracle after qualification. Regenerated facades,
declarations, manifests and capture input must all exclude the same unavailable
global. This source unit does not regenerate packages, caches or distribution
artifacts. CI manager p103700 owns broader checks after the parent routes them.
