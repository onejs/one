# One audio next minor: Now Playing ownership and paused loading

Issues: [#1065](https://github.com/onejs/one/issues/1065) managed players cannot own
Now Playing, [#1066](https://github.com/onejs/one/issues/1066) load the global session
paused at a position. Specs: `~/contrast/plans/contrast/oss-audio-now-playing-1065.md`,
`oss-audio-paused-load-1066.md`.

This feature batch targets the next minor release. Crossfade timing stays in application code.

This branch prepares the package family at 2.12.0 (2.11.5 is the latest stable).
No stable release is authorized by preparation.

## API

```ts
Audio.play(uri, options?: { positionMs?: number; paused?: boolean })
player.setNowPlayingInfo(info: AudioNowPlayingInfo): Promise<void>
player.clearNowPlayingInfo(): Promise<void>
AudioRemoteCommandEvent.playerId?: string
```

Native bridge: `play(uri, options)`, `setPlayerNowPlayingInfo(playerId, info)`,
`clearPlayerNowPlayingInfo(playerId)`, and `playerId` on the remote event. The
bridge takes `options` as a required struct and JavaScript passes `{}` when it
is omitted: nitrogen 0.37.1 delivers an optional struct argument to Swift as nil
even when C++ received it (seen on the iOS simulator).

## Decisions

- Paused loading extends `play` with options instead of a new `load` call. Without
  options `play` is unchanged. With either option it prepares, seeks with zero
  tolerance, and resolves once the seek lands: paused, or playing from the position.
- While a prepared load is pending, status is `loading`; `pause` and `resume` set
  whether it starts; `seek` rejects with `E_AUDIO_STATE`; a new `play` or `stop`
  rejects it with `E_AUDIO_STATE`. Late completions check the load's identity and
  do nothing after replacement.
- Positions past the end clamp to the duration. Load errors reject and leave the
  status failed. On web a source that cannot seek (no range requests) fails instead
  of silently starting at 0.
- One owner holds the single system session: the singleton or one managed player.
  A claim moves ownership without clearing the card first: Android keeps its
  `MediaSession` and web keeps the Media Session handlers. iOS starts an
  `MPNowPlayingSession` for the new player and publishes its card in the same pass,
  because `addPlayer`/`removePlayer` on the live session raised an Objective-C
  exception on the iOS 27 simulator. A claim for the same player keeps its session.
- Owners release only their own claim. `Audio.clearNowPlayingInfo`, `stop` and a new
  `play` release only the singleton's; `player.clearNowPlayingInfo`, `remove` and
  hook unmount release only that player's. No fallback to the singleton.
- Remote play, pause and seek drive the owner only; listeners get `playerId` for a
  managed owner. The app pauses the other half of a crossfade itself.
- `player.replace` keeps the claim and metadata. Interruptions pause all players as
  before and resync the owner's card.
- Android's background service follows the singleton or the owning managed player.
- Web: a claim still decoding artwork loses to a newer claim or a release and rejects.
  Native artwork loads synchronously, so there is no late claim there.
- Pause during loading before preparation on Android used to start anyway; the
  prepared listener now honors the pause.

## Validation

- Web: real Chromium and WebKit probe of the bundled module covering paused load,
  positioned play, resume, pause and seek during load, replacement and stop
  cancellation, clamp, validation, unseekable source, ownership transfer with remote
  play, pause and seek, scoped cleanup, late artwork, and metadata never cleared
  during transfer.
- iOS simulator: paused load and resume passed in the native-features fixture. Ownership transfer crashed; the subsequent fix has not been rebuilt or rerun because Xcode stalled in build preparation. The full `audio-ownership` suite remains unverified.
- Android: a Kotlin compile passed before the final bridge change; the final version remains uncompiled on this host due to SDK access failure.
- Remaining before release: lock screen card and remote play, pause and seek during
  a transfer on a physical iPhone and Android device.

---

# One 2.11.0 release

Prepare the approved native Mac, Linux, URL schema, iOS link-set and DOM features together in PR #1027 on `tm/macos-resume`. One 2.10.0 was published separately from main for the native application-context API and existing iOS fixes. This branch prepares 2.11.0; final owner review, merge and explicit stable publication remain held. The prior release record below is preserved.

## Included

- Experimental AppKit/Fabric Mac host on the installed React Native core and Hermes, native controls and symbols, menus and keyboard commands, per-window toolbars, semantic colors, scrolling, transport, storage and accessibility.
- Shared desktop runtime and GTK Linux host with controlled native controls, routing, menus and shortcuts. Portable static PIC ICU and Linux CI build both x86_64 and aarch64.
- Standard Schema query typing and `validateSearchParams`, with collected component schemas and loader validation before execution.
- iOS production link groups selected at prebuild; Debug retains all groups and stale Release builds fail with regeneration instructions.
- One-owned DOM components for iOS and Android through the Vite native bundler, resource handlers and update lifecycle. Metro and desktop DOM deliberately reject unsupported compilation.

## Validation and remaining delivery

The containing published canary `2.0.0-0.canary.1792923527905` identifies runtime source `9cd108ebc7`. The installed Mac archives match registry integrity and package files. Its incremental native Debug build and production macOS bundle pass. The actual inactive app shows populated data and visible light/dark drafts, restores the exact draft after session navigation, changes and restores filters and both panes, and reloads through the native menu. Captures and artifact hashes are retained.

Original combined Mac Debug and embedded offline Release fixtures passed controls, menus, appearance and reload; Linux VM controls and routing passed. Linux portability run 40186988728 built the core and host, compiled bytecode and painted first content on both architectures; neither Hermes binary imports system ICU. Updated packaging scripts have source review but were not repackaged after static ICU. No new startup timing or x86 interaction claim is made.

DOM's original actual iOS Fabric Release proof loads embedded A offline, stages B without activating it, activates native and DOM B together, and rolls a failing C back to B. Eleven selected installed B assets match. Debug actions, refs and HMR passed. Android has host-only coverage, with no Fabric/Updates app claim. Minimum OS, physical devices and comparative performance were not measured. Combined source validation is distinct from that original app proof.

Published URL-schema production browser, public type and generated Vercel-handler checks passed; the corrected cold development probe awaits hydration and committed navigation. Hosted rewrites, worker execution and native query transport remain unexercised. Published iOS linking checks passed no-group Release, all-group Debug, stale rejection and regenerated Apple Pay. The scratch linking fixture omitted drawer routes because the optional peer was absent.

CI found four stale strict plugin-context expectations and a Vite-only DOM route in the default Metro fixture graph. Both are repaired with existing checks and actual Metro/Vite bundle proof. A malformed debug inspect lacking a target id exposed a null-string crash; the shared lookup guard passes actual missing, empty and numeric target commands followed by valid inspection on an incrementally rebuilt host. Exact containing required CI and a final artifact receipt remain with the existing CI owner.

Independent native, DOM, Linux and schema reviews remain attached to their source histories; the focused final repair review is pending. Mac high contrast and active-window accent interactions, bare Tab/two-window checks on the latest combined host, Linux secondary pointer/touch and some advanced navigation options remain limited. Windows and Nitro V1 are separate. No stable release is authorized by preparation.

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
