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
