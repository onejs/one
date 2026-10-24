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
`plans/contrast/one-native-sdk-bundle-size.md`: compact generated SDK runtime
facades and direct root hook exports. Keep typed declarations, framework-wide
wrapper registration, native selector IDs, first-call errors and both bundlers
compatible. Publish branch canaries for downstream validation, not a stable
release.

The compact candidate now uses cached framework initializers behind enumerable
CommonJS getters. A manifest resolves native class names, extension names and
protocol USRs before registry reads. Initializers preserve constructors and
prototypes, run bases before extensions, and cache failures. Generated native
constant errors move from import to the first framework use.

The all-framework differential passed for 290 frameworks before the latest
ES2020 output adjustment. Focused runtime checks cover extension ordering,
cycles, sticky failures, protocol lookup and native-handle-first access. Both
actual Metro and browser transforms pass named, star and namespace imports,
descriptors and identity with React Refresh disabled. The real Contrast package
compiler emits 1,467,795 bytes for the ten reached SDK framework bodies, versus
5,059,583 original factory bytes. Wrapper overhead and the complete consumer
artifact still need measurement.

The candidate is not ready to merge: Metro React Refresh reads every SDK export
getter and defeats lazy initialization in the welcome project. The captured
initializer work is about 49 ms against the 14.57 ms paired baseline. Timing
only the outer module factories would incorrectly omit this work. The lead's
reviewer is considering a narrow Refresh opt-out before implementation.
SDK regeneration is running because wire changes alter the native generation.
The production homepage chunk comparison, exact canary artifact verification,
local welcome rebuild and six capability calls on Peach and iOS remain open.
Contrast's isolated worktree is held by the lead until lane capacity frees.

Option b is not included. An exploratory graph-pruning probe removes 347 modules
and every SDK binding, estimating 7,504,327 code bytes. It still needs actual
native and homepage measurements and a documented root-to-subpath migration
before inclusion. The lead owns any acceptance tradeoff; a different large model
must approve the final PR before merge.
