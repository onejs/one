# One 2.10.0 release

Add the experimental native macOS target as one minor release. The complete feature stays on `tm/macos-resume`, in PR #1027, for owner review before merging or stable publication. Package versions are prepared at 2.10.0; this does not publish them. The previous iOS release record below remains intact.

## Included

- An AppKit and Fabric host using the installed React Native core and Hermes, with Mac-specific resolution and build files inside the existing One package.
- Native text, composition-aware input, scrolling, images, pointer and accessibility events, animation updates and runtime teardown repairs.
- HTTP, Blob and FileReader, WebSocket, SQLite and native idle callbacks used by a shared application.
- AppKit buttons and segmented controls, semantic system colors, explicit line-height alignment, linear backgrounds and typed application menus and keyboard commands.
- Native bundle module scoping and a shared One entry whose imports remain valid under platform suffix resolution.

## Validation and release review

Incremental native fixture builds and running probes cover animation without React rerenders, input composition and undo, transport errors and cancellation, native controls, inactive accessibility, menus, appearance, resize and reload. The shared Team Machine app has loaded live rows and transcripts, retained per-session drafts and switched native filters. The combined application passes inactive native menu actions, repeated light/dark draft appearance changes, exact draft restoration after switching sessions, native feed filters and corrected sidebar metadata layout. Related Tamagui native theme and config fixes are reviewed in PR #4378.

The runtime candidate is `ea447e78bdfb07c4711c1d309a90f9c2394e9345`, published as `2.0.0-0.canary.1792761148499` by release run 39959092975. Exact npm One and vxrn tarballs both identify this source. The native text source hash matches the reviewed appearance repair. Its actual text-storage regression fails four cross-appearance cases before the fix and passes all eight afterward; independent review extends this to 64 checks. The real consumer rebuild confirms visible drafts through repeated appearance changes. The earlier canaries are superseded. Owner review of the prepared feature remains the next release step; stable publication requires explicit approval.

No fresh cross-platform binary size or performance comparison is claimed. Reanimated, radial or repeating gradients, gradient transition hints, DynamicColorIOS, multipart or URI request bodies and Blob WebSocket sends remain unsupported. Split view renders its slot only. High contrast, global accent changes and foreground-only interactions were not exercised.

---

# One 2.9.0 release

Ship the generated iOS SDK and native interface work as one minor release. PR #961 is merged; stable publication is paused while the SDK coverage followup is completed.

## Included

- Generated runtime facades and declarations for 290 iOS frameworks, with explicit unsupported-member filtering.
- SDK-derived SwiftUI hosts, UIKit interoperability, unified-module migrations, observation and inherited main-actor isolation.
- React content hosted in UIKit collection cells, table cells and ordinary UIKit views.
- Generated parameterized values, numeric ranges, defaulted slot options and gesture reporting, plus native drag binding inside a fixed React Native host.
- Matching documentation, declarations and the prepared 2.9.0 package family.

## Closeout

The merged SDK artifacts use ABI `0e503aef608672fa`. The coherent native app compiles and starts. Bounded native proofs cover UIKit content presses, resizing, unmount/remount and replacement; generated hosts; gesture events; drag movement while JavaScript is blocked and all three snap targets; multiline ranges and inset options. Share, same-module inherited-method transport and both full release CI workflows passed. These are behavior proofs, not exhaustive coverage or hardware performance claims.

The followup adds owner-generic instance members through native specialization, asynchronous throwing JavaScript callback replies and protocol witnesses, associated-type existential handles, and reference calls aligned with actual facade exports. The coherent 290-framework generation uses ABI `212edf3d13b127f5`: 988 entries added, none removed, and all previous observations retained. Every generated module passes its SDK compiler check. Compiled native runtime probes cover specialization, concurrent asynchronous results, errors, cancellation, reply release and malformed replies; the JavaScript wire boundary checks the matching envelopes. Generated Sendable witnesses pass strict Swift 6 checking without unchecked witness annotations. These followup proofs are compiler and runtime probes, not a fresh simulator application run.

The release also includes PR #974, which escapes literal dynamic SPA route paths in the server entry globs. Its existing production-build regression suite passes all 13 checks.

Keep unsupported APIs and placement limitations explicit. Synchronous callbacks that escape the JavaScript-thread call, arbitrary app-authored Swift types and SwiftUI builders are not covered by these changes. API name coverage does not imply that every overload or callback shape is supported.

After followup review, matching artifact checks and bounded native validation, prepare the followup PR for release approval. Publish the prepared stable version only after approval resumes publication, then verify the exact npm artifact's source revision and changed runtime bytes.
