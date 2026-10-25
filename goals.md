# One 2.10.0 release

Add the experimental native macOS target as one minor release. The complete feature stays on `tm/macos-resume`, in PR #1027, for owner review before merging or stable publication. Package versions are prepared at 2.10.0; this does not publish them. The previous iOS release record below remains intact.

## Included

- An AppKit and Fabric host using the installed React Native core and Hermes, with Mac-specific resolution and build files inside the existing One package.
- Native text, composition-aware input, scrolling, images, pointer and accessibility events, animation updates and runtime teardown repairs.
- HTTP, Blob and FileReader, WebSocket, SQLite and native idle callbacks used by a shared application.
- AppKit buttons with bordered and borderless presentation, segmented controls with native control roles, SF Symbol images, semantic system colors, explicit line-height alignment and linear backgrounds.
- Typed application menus, keyboard commands and optional per-window toolbars, with independent window routing and hidden-subtree accessibility and focus handling.
- Native bundle module scoping and a shared One entry whose imports remain valid under platform suffix resolution.

## Validation and release review

Incremental native fixture builds and running probes cover animation without React rerenders, input composition and undo, transport errors and cancellation, native controls, inactive accessibility, menus, appearance, resize and reload. The shared Team Machine app has loaded live rows and transcripts, retained per-session drafts and switched native filters. The combined application passes inactive native menu actions, repeated light/dark draft appearance changes, exact draft restoration after switching sessions, native feed filters and corrected sidebar metadata layout. Related Tamagui native theme and config fixes are reviewed in PR #4378.

The latest runtime candidate is `aa1caa54bb4ec13e24bdcae104d08bbef8303aa2`, published as `2.0.0-0.canary.1792805921308` by release run 40050679650. Packed One, vxrn and compiler manifests identify this source and match registry integrity. All 96 packaged Mac native source files match the consumer installation. Its retained incremental TeamMachineOne Debug build recompiles the base component view and passes; a production JavaScript bundle runs in the real inactive native window. Light and dark image previews keep rounded parent clipping without repeating the radius on the child image. Own-session drafts survive document replacement and return, cleared drafts remain empty, and native feed filters and sidebar toggles restore. The consumer is landed on Team Machine main through `4258a98c36adf5628f7e7c943b0007164791b6c3`; its later minimap accessibility correction is `4361983f17def1dbb8ac0086397d412729895e27`.

Independent reviews cover the native animation and teardown repairs, HTTP and Blob lifetime, input composition and undo, semantic text appearance, symbol point sizing, per-window toolbar identity, accessibility and rounded clipping. The real consumer uses published One and Babel-free Tamagui canaries in its isolated Mac dependency root. Focused Mac typechecking retains three existing GPUI missing-export diagnostics. This establishes neither a native Release build nor a fresh cross-platform runtime comparison. Owner review of the prepared feature is the next step; stable publication requires explicit approval.

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

## SDK bundle size candidate

The approved scope is options a and c in Contrast's
`plans/contrast/one-native-sdk-bundle-size.md`. Root hooks and the stack toolbar
import capability modules directly. Native SDK output strips comments and types
and shares framework call prefixes while retaining native class/member syntax,
eager wrapper registration, descriptors and error timing. Runtime and native
SDK tables remain on their original coherent generation 3864e7f38681b875.

The Contrast lead selected this class route after comparing both implementations.
In five production-shaped intercepted-artifact pairs, it saved 2,423,686 SDK bytes
with 2748 modules unchanged and framework evaluation at 19.73 ms versus 20.65 ms
paired baseline. Both are above the historical 14.57 ms figure; relative no-rise
is established for this run. The compact table route saved 3.549 MB but evaluated
at 62.07 ms versus 19.64 ms paired baseline. The lead replaced the plan's 3.5 MB
estimate with the measured class result, keeping no startup rise as the priority.
Neither route is claimed to meet the original two requirements together.

All 290 framework differentials and Metro/Hermes/browser probes pass names,
descriptors, registry metadata, call records and identity. No facade contains
private members or static blocks, and ES2020 emits no class-lowering helpers.
The full package build and 37 focused checks passed. Reviewer r122897 approved
the source; the published canary is 2.0.0-0.canary.1792822660841 from f3dfce7dd49.
Its tarball contains all 290 facades, and installed resolution passes for each.
Later source changes only remove formatting and merge a main workflow change.

The rebuilt welcome consumer saves 2,208,935 SDK bytes with 2748 modules unchanged.
The actual React Native Babel pipeline differs from the exploratory commonjs-only
probe. Five pairs give 14.020 ms original and 14.065 ms candidate medians, with
median paired delta -0.320 ms; both are below historical 14.57 ms. First native
frame medians are 8933.745/7589.605 ms with rebuilt payload interception.
Local prebuilt GET bodies shrink from 13,821,072/2,162,935 zstd bytes to
11,542,076/2,096,910; loopback GET medians 10.902/9.761 ms are not production
network latency. Six first-use capabilities and UIApplication/UIWindow wrappers
match on Peach and a freshly built iOS 27 simulator app. Homepage router bytes
fall 450,074 to 160,758, gzip 140,208 to 53,478; hydration and Explore/back work
without page errors. Production rollout checks belong to Contrast's consumer
lane and CI owner. No stable release is authorized.

Option b is excluded. The exploratory root-edge pruning estimate is 7,504,327
bytes with 347 modules removed. The class route retains One's root public API.
