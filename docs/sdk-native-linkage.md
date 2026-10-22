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

The correction supplies Clang framework modulemaps marked `extern_c`. Their
umbrella paths name the original SDK headers, and their link directives
retain the original frameworks. There are no substitute declarations,
implementations, symbol aliases or SDK mutations. One writes these maps into
the generated pod, the generator's compiler work directory, or a caller's
fresh support directory. All generated framework tables remain in one module.

TESTED: all 19 references link together with the maps on device and simulator,
including explicit module builds. A simulator control also imports and links
the retained One runtime. The SDK warning about a macOS sysroot remains in
successful controls; it does not establish a cause for these failures.

## SDK overlay metadata correction

The first correction in PR #1013 covered the 19 helper references but missed
an AVFoundation overlay dependency. Asset author s65792 reproduced the actual
fresh generation failure with a typed call to
`AVCapturePhotoOutput.supportedRawPhotoPixelFormatTypes(for:) -> [OSType]`.
The SDK's imports pass on device and simulator; the external modulemap alone
breaks SIL deserialization of `__supportedRawPhotoPixelFormatTypes` on both.

TESTED: changing the external modulemap to a framework module or using the
original absolute umbrella header does not fix the failure. Providing the
original `AVFoundation.apinotes` beside the external map does. The SDK notes
mark `supportedRawPhotoPixelFormatTypesForFileType:` as `SwiftPrivate: true`,
which supplies the private name used by the distributed Swift overlay. Moving
the modulemap lost automatic discovery of this native metadata.

The correction keeps the modulemaps and adds Clang API notes search paths for
the four original SDK framework header directories. One shared flag function
serves generator checks, generated pods and external consumers. Notes stay in
the SDK and are read from the selected target's SDK root. No copies, replacement
notes, symbol aliases, changed table entries or suppressed checks are involved.

TESTED: the retained full AVFoundation table that failed fresh generation now
passes the generator's SIL check against both SDKs. The typed overlay call and
all 19 exported helper references also compile and link together under C++20,
WMO and explicit modules on both targets. This is bounded source qualification,
not a complete fresh SDK generation or combined constants capture. Its exact
controls and results are in the `overlay` subdirectory of the evidence record.

## Cross-framework header ownership correction

The subsequent fresh generation passed compilation but omitted the legitimate
AVKit initializer `init(view:deviceTypes:changeHandler:)` on
`AVCaptureDeviceDirectionCoordinator`, ID 4149603380729748. Asset author s65792
found this additional removal in the complete metadata comparison before
committing generated files. Its unchanged `[AVCaptureDevice.DeviceType]`
parameter resolved to `AVKit.AVCaptureDevice`, which has no nested `DeviceType`.

TESTED: the exact typed initializer passes with original SDK imports and fails
with the wrapper modulemap plus restored API notes on both targets. Explicit
AVFoundation qualification avoids the lookup failure. More directly, naming
the SDK's original umbrella header in a framework modulemap restores the
unchanged expression on both targets. The AVKit header imports
`AVFoundation/AVCaptureDevice.h` directly. A wrapper umbrella did not preserve
that header's owning module, allowing AVKit to redeclare its classes.

The writer now names the actual target SDK's umbrella header and retains
`extern_c`, original exports, framework links and API notes. Generator checks
and external consumers use their selected SDK root. Generated pods write one
map for each target SDK and select it through `$(PLATFORM_NAME)`; their API
notes paths still use `$(SDKROOT)`. Support is generated on the build host and
must be regenerated when switching SDK roots. No emitter spelling changes,
substitute types, aliases or API exclusions are needed.

TESTED: the original retained full AVKit table, including the initializer, and
the retained full AVFoundation table pass the dual-target generator SIL check
without changing either input file. The initializer, AVFoundation overlay and
all 19 C helpers also pass SIL and native linking together under C++20, WMO
and explicit modules on both targets. The bounded controls are retained in
the `avkit` evidence subdirectory. In-memory AVKit emission restores all 192
entries with no added, removed or changed metadata relative to the retained
baseline, including the same initializer ID. Complete SDK regeneration and metadata
qualification remain with the asset author.

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

The SDK bundle exports `writeSdkNativeSupport(buildSupportDir, sdkRoot)`, returning
`{ generation, swiftFlags }`. Consumers compare its generation with the cached
tables and append its flags unchanged. The helper writes `module.modulemap`
below the supplied directory. Its umbrella and API notes search paths refer to
the original selected SDK. If omitted,
the SDK root defaults to the selected iPhone simulator SDK. Generated pods use
the build's `$(SDKROOT)`; generator checks use each target's explicit SDK root.
The generator
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
