# One owner decisions

Nate's directions for One, newest first, in his words where recorded. Read this before writing a brief, a proposal or a review; a review's first check is whether the work contradicts an entry here. Whoever hears a new direction adds it the same turn.

- 2026-10-04: blur is built on `@sbaiahmed1/react-native-blur` (MIT), the library the Team Machine app used (team-machine 4fe201b06). "PLATFORM native" blur effects and "a real iOS progressive blur"; "literally just use that code". EdgeFade's vendored react-native-edge-fade blur stack is replaced (lane one-native-blur).
- 2026-10-04: blur sits behind chrome such as the composer: "It should know that blur should just be behind the composer". Fix layer order; never offset chrome around a blur.
- 2026-10-04: unified APIs live at the root of `One`; `One.iOS` keeps the generated iOS-specific API.
- 2026-10-04: scope is making every native API work on iOS, Android and web, plus the decided unification. "We already have enough just making all the native APIs work ... Why are you adding now random features?" No new features.
- 2026-10-04: One bridges to native. "Reanimated should NOT BE PART OF OUR UI ... WORKLETS. NOT REANIMATED. WE AREN'T DOING CUSTOM UI WE BRIDGE TO NATIVE." Headless components may offer worklet callbacks; the app brings its own UI (page dots and the like).
- 2026-10-04: One canary releases never need Nate's approval, from any branch.
- 2026-10-03: speed benchmarks are parked ("Just leave speed for now").
