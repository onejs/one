# One native GL

**Recommendation (INFERRED):** One ships no GL view of its own. It stands on
`react-native-webgpu` (Dawn), which Contrast's templates already include. One's part is a
docs section, a fixture and conformance suite that prove a WebGPU frame and a React Three
Fiber scene paint on iOS and Android, and making sure One's native bundler honors the two
resolve aliases R3F needs. Apps and Contrast skills move off `expo-gl` onto R3F over
WebGPU. Margelo's `react-native-filament` stays the option for glTF model viewers. It is not
used as the GL route.

Scope: written design against `origin/v2-beta` at `8afc4a8eb`. Nothing was built or run
for this document.

## Evidence

- **RAN (read):** Contrast teaches three renderers
  (`~/contrast/src/ai/skills/docs/contrast-webgpu.md:22-26`): R3F on native through
  `@react-three/fiber/native` and ExpoGL, imperative Three on `react-native-webgpu`, and
  TypeGPU or raw WebGPU on `react-native-webgpu`. The ExpoGL path is the only one that
  declares `expo-gl` (`:35`). The game template uses it:
  `templates/game/features/designer/DesignerCanvas.native.tsx:1,20-30` imports `Canvas`
  from `@react-three/fiber/native`, and `templates/game/skills/game-rendering.md:10-11`
  says "Native uses `@react-three/fiber/native` and ExpoGL".
- **RAN (read):** R3F 9.7.0's native entry cannot avoid Expo. It `require`s `expo-gl`,
  `expo-asset` and `expo-file-system` (`@react-three/fiber/native/dist/react-three-fiber-native.cjs.dev.js:9,12,369-371`),
  renders `expoGl.GLView` (`:260`), and pins `dpr` to the device ratio because "expo-gl can
  only render at native dpr" (`:209-211`). Its `peerDependencies` list `expo >=43.0`.
  We may not add Expo packages, so R3F's native entry is ruled out.
- **RAN (read):** `react-native-webgpu` 0.5.14 (repository `wcandillon/react-native-webgpu`)
  peers on `react-native >=0.81.0`, `react-native-reanimated >=4.2.1` and
  `react-native-worklets >=0.7.2`. It vendors `libs/apple/libwebgpu_dawn.xcframework`
  (`react-native-webgpu.podspec:22`), and its prebuilt `libs/` directory is 164 MB on disk
  (`du -sh`). `expo-gl`'s installed directory is 257 MB. Neither number is app binary
  size. `@vxrn/native` already requires `react-native-worklets`
  (`packages/native/android/build.gradle:83-87`).
- **RAN (read):** its README says Three runs on it from r168, and that R3F works once the
  bundler resolves `three` to the WebGPU build and `@react-three/fiber`'s `react-native`
  condition to the web entry (`node_modules/react-native-webgpu/README.md:30-38`, which
  does it with `patch-package` and a metro config). Contrast pins `three` 0.184.0 and
  R3F ^9.7.0 (`~/contrast/package.json:77,228`).
- **RAN (read):** the web entry touches browser globals at import. Contrast keeps it out of
  server-imported route modules behind a lazy import (`contrast-webgpu.md:121-126`).

## Options compared

| route | what One maintains | cost | verdict |
| --- | --- | --- | --- |
| GL view inside One | a GLES or ANGLE context, a JS binding for the WebGL API, a frame and present bridge, texture upload, on both platforms | a large custom subsystem. OpenGL ES is deprecated on iOS, so a real implementation means ANGLE on Metal. **INFERRED** from the platform, not measured. | rejected by the direction's "no large custom subsystems" |
| `react-native-webgpu` | aliases, docs, fixture, suite | Dawn binary size (spike measures it); WebGL-only code must port | **recommended** |
| `react-native-filament` (Margelo) | nothing | a physically based glTF renderer with its own scene API. It does not run Three or custom shaders written for WebGL. **GUESSED** from the library's scope; not read in this pass. | the blessed choice for model viewers only |
| `expo-gl` | nothing | Expo package, plus `expo-asset` and `expo-file-system` pulled in through R3F native | excluded by the no-Expo rule |

## What One does

1. **Resolution.** The two aliases from the README become documented app config: `three` →
   `three/webgpu`, and `@react-three/fiber` → its web entry on native. One owns the bundler,
   so no `patch-package` is needed. **GUESSED:** One's native (rolldown) build already
   applies a user `resolve.alias`. Slice G1 checks that first. If it does not, the fix goes in
   vxrn's native config (`packages/vxrn/src/config/getReactNativePlugins.ts` or
   `mergeUserConfig.ts`) so the user's alias takes effect, and One adds no GPU-specific
   switch.
2. **No wrapper component.** Apps import `Canvas` and `useCanvasRef` from
   `react-native-webgpu`. For R3F they follow the library's own Fiber example (README
   `:32` links `apps/example/src/ThreeJS/Fiber.tsx`). **GUESSED:** that example passes a
   `WebGPURenderer` through `<Canvas gl={...}>`. The file was not read in this pass, and G1
   copies whatever it actually does. A One wrapper would only rename a blessed library's API.
3. **Web.** The same imports run on the browser's WebGPU. The docs show the lazy import
   from `contrast-webgpu.md:121-126` so SSR and SSG never evaluate the module.

## Migration cost for existing ExpoGL scenes

- Declarative R3F scenes keep their scene code. The canvas entry changes from
  `@react-three/fiber/native` to R3F's web `Canvas` with a WebGPU renderer.
  **GUESSED:** GLSL `ShaderMaterial` and `RawShaderMaterial` do not render under Three's
  `WebGPURenderer` and must move to node materials (TSL). This is the one real porting cost.
  G1 checks it with a single `ShaderMaterial` in the fixture.
- `dpr` becomes honored on native (the web canvas sizes like the web, README `:164`), which
  removes the fixed device-ratio cost noted in `DesignerCanvas.native.tsx:12-15`.
- Contrast's skill and templates change in Contrast (`contrast-webgpu.md:22-37`,
  `game-rendering.md:10-11`). That is not One code. This design hands it to the Contrast
  owner once G1 passes.

## Excluded

A One GL or WebGL context, `expo-gl` compatibility shims, `GLView` snapshots,
`takeSnapshotAsync`, a camera-to-texture API (the library already exposes shared texture
memory, README `:225-229`), and offscreen rendering helpers.

## Slices

1. **G1 proof.** Add `tests/native-features/fixtures/one-native-gpu.tsx` with two panes: a
   raw WebGPU triangle (configure, submit, `present()`), and an R3F cube on
   `WebGPURenderer` with one `ShaderMaterial` probe. Add `react-native-webgpu` and `three`
   to the fixture app only. Add a `gpu` entry to `suites`
   (`tests/native-features/scripts/one-native-conformance.ts:25-43`) and a step in the Android
   flow. The suite samples the centre pixels of each pane through the existing pixel gate
   (`tests/native-features/scripts/visual-pixel-gate.ts`) and asserts the known fill colours.
   Also record the IPA and APK size with and without the dependency.
   **GUESSED risk:** Dawn needs Vulkan on Android. If the standard emulator image cannot
   provide it, the Android step runs on a physical device and the doc says so.
2. **G2 docs.** A `## GPU (WebGPU)` section in `apps/onestack.dev/data/docs/native-features.mdx`:
   install, the two aliases, raw and R3F examples, the lazy web import, and the ShaderMaterial
   note decided by G1.
3. **G3 hand-off.** Send the G1 result to Contrast so its skill and templates can drop the
   ExpoGL path.

No unit tests: One adds no JS logic here.
