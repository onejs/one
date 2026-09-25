# One native fonts

**Recommendation (INFERRED):** ship `One.UI.Fonts` from `one/fonts`: a runtime
loader with two calls, `load` and `isLoaded`, plus a `useFonts` hook, and a
`native.app.fonts` list that prebuild embeds in the binary. The runtime loader is the
part that matters most, because a Contrast generated app runs on a prebuilt template
binary and picks its fonts after that binary exists. One rule covers both paths and both
platforms: a font is addressed by its PostScript name, one file per cut.

Scope: written design against `29fa071d1`, which was the head of both `origin/v2-beta`
and `origin/v2-next` when this was written. Nothing was built or run on a device for this
document. Reviewed once by another model; its required changes are folded in below.

## Evidence

- **RAN (grep):** prebuild does nothing with fonts today. `font` appears nowhere in
  `packages/vxrn/src/exports/prebuildWithoutExpo.ts` or
  `packages/one/src/native/appManifest.ts`, and no `UIAppFonts` or `assets/fonts`
  handling exists under `packages/*/src`.
- **RAN (read):** Contrast's only font path is runtime loading. Its skill has
  `setupNative.ts` call `loadAsync` from `expo-font` with an ESM import of each `.ttf`
  under `public/fonts/`, keyed by PostScript name, one entry per weight, and tells web to
  use a plain CSS `@font-face` (`~/contrast/src/ai/skills/docs/font-assets.md:27,60,95-103`).
  It rejects `.woff2` on native (`:111`).
- **RAN (read):** a `.ttf` import already works in One's native build. `ttf` is in
  `DEFAULT_ASSET_EXTS` (`packages/vxrn/src/constants/defaults.ts:34`) and the asset plugin
  turns the import into `AssetRegistry.registerAsset(...)`, a numeric asset id
  (`packages/vxrn/src/utils/createNativeDevEngine.ts:1690`). Release builds copy the file
  to the iOS bundle under its `httpServerLocation`, and on Android to a resource named
  like Metro names it (`createNativeDevEngine.ts:1893-1923`).
- **RAN (read):** expo-font's native side is small but carries two things One should not
  copy. It swizzles `UIFont.fontNames(forFamilyName:)` so an arbitrary alias can stand
  for a PostScript name (`expo-font/ios/UIFont+FontFamilyAlias.swift:1-38`), and it
  rebuilds variable fonts into weighted typefaces on Android
  (`android/.../VariableTypefaces.kt`, `FontVariationAxes.kt`, 222 lines). Its JS needs
  `expo-asset` to turn an asset id into a local file (`expo-font/src/FontLoader.ts:1,37`).
- **RAN (read):** React Native on iOS resolves `fontFamily` as a family name first and
  falls back to a PostScript name
  (`ReactCommon/.../textlayoutmanager/RCTFontUtils.mm:355-363`, RN 0.87.1). So a
  registered font is reachable by its real names with no alias layer.
- **RAN (read):** React Native on Android resolves a custom family from
  `assets/fonts/<fontFamily>.ttf|.otf` by file name (`ReactFontManager.kt:162-180`),
  accepts runtime typefaces through `addCustomFont(fontFamily, typeface)` (`:94`), and
  exposes `customFontFamilies` (`:37`).
- **RAN (read):** `CTFontManagerRegisterFontsForURL` is current in the iOS 26.4 SDK;
  `CTFontManagerRegisterGraphicsFont` is deprecated since iOS 18 (`CTFontManager.h:171,216-218`).
- **RAN (read):** the community template 0.87.2 has a plain resources phase with two
  entries and no synchronized folder groups (`HelloWorld.xcodeproj/project.pbxproj:11,18,44,160-161`),
  so a new bundle resource would need four pbxproj lines. Prebuild already rewrites the
  React Native bundle script phase and throws when it cannot (`prebuildWithoutExpo.ts:78-115`).
- **RAN (read):** Android modules are registered by hand in `OnePackage.kt`:
  `getModule` (`:18`) and one `ReactModuleInfo` each with `isTurboModule = false`
  (`:29-51`, SafeArea and Sync). `one` already embeds fonts of its own as
  `res/font` resources read through Compose `Font(R.font...)`
  (`OneNativeComposeNodeView.kt:1449-1450`); that path serves Compose text only and does
  not reach React Native `fontFamily`, so it is no substitute for `assets/fonts`.

## The one rule

iOS names a font by what is inside the file. Android names a runtime font by what the
caller says, and an embedded font by its file name. The only name all four cases agree on
is the PostScript name, and only when the embedded file is named after it. So:

- the key passed to `load` is the font's PostScript name (`Inter-Bold`);
- an embedded file is named `<PostScriptName>.ttf` or `.otf`;
- styles use `fontFamily: 'Inter-Bold'` and leave `fontWeight` unset. Setting both makes
  Android synthesize bold over a cut that is already bold.

This is the shape Contrast's `font_install` already emits and the shape a Tamagui `face`
map wants. One enforces the rule where it can, so a font cannot work on one platform and
silently fall back on the other:

- iOS `load` registers the file, then checks the requested name resolves. If it does
  not, it unregisters the file and rejects with the names the file does provide:
  `"heading" is not a name in this font. it provides: Inter-Bold (family Inter)`.
- prebuild reads the PostScript name out of each listed file (the sfnt `name` table,
  name id 6, about 35 lines, no dependency) and fails when the file name differs, saying
  what to rename it to.
- Android `load` cannot check: `Typeface` has no name query, so it registers under
  whatever key it is given. **Accepted limitation:** a wrong key works on Android and is
  rejected on iOS. One does not parse the font file on Android to close this, because the
  iOS rejection and the prebuild check already stop a wrong key from shipping in any app
  that runs on both. The docs state it, and the Android suite asserts the documented
  behaviour (a wrong key resolves and renders the font) so a later change to it is seen.

## API (exact surface)

```ts
// one/fonts, surfaced as One.UI.Fonts and One.UI.useFonts
type FontSource = number | string // an imported font asset, or a file:// or https:// uri
type FontMap = Readonly<Record<string, FontSource>>

interface Fonts {
  load(fonts: FontMap): Promise<void>
  isLoaded(name: string): boolean
}

function useFonts(fonts: FontMap): readonly [loaded: boolean, error: Error | null]
```

- `load` takes only the map form. Expo also accepts `(name, source)`; one form is enough
  and the map is the one Contrast and `useFonts` use. It resolves when every font is
  usable and rejects with the first failure. Loading a name that is already usable
  resolves at once, so calling it again after a JS reload is safe.
- `isLoaded` is synchronous and asks the platform, so it is also true for embedded and
  system fonts and there is no JS record of loaded names. iOS:
  `UIFont(name:size:) != nil || !UIFont.fontNames(forFamilyName:).isEmpty`. Android: the
  name is in `customFontFamilies` or `assets/fonts` has a file with that base name.
- `useFonts` is Expo's hook and return shape, written over `load`: about ten lines.
- Migration from `expo-font`: `loadAsync(map)` becomes `Fonts.load(map)`,
  `isLoaded` and `useFonts` keep their names.

**Spec.** One legacy module `OneNativeFonts`, spec file
`src/specs/OneNativeFontsNativeModule.ts`, resolved with one lazy cached
`TurboModuleRegistry.get<Spec>()`. On Android it is added to `OnePackage.kt` in
both `getModule` and `getReactModuleInfoProvider` with `isTurboModule = false`, like
SafeArea and Sync:

```ts
interface Spec extends TurboModule {
  load(name: string, uri: string): Promise<void>
  isLoaded(name: string): boolean
}
```

**JS.** The only JS logic is turning a source into a uri. A string is used as is. A
number goes through `Image.resolveAssetSource(source)`, which returns null for an id
that is not a registered asset; that case throws `Fonts.load: "<name>" is not a font
asset` before any native call. Then one `load` call per entry under `Promise.all`. React
Native core already owns that resolution, so One needs no `expo-asset`. With the native module missing, `load` rejects
with `fonts need a native build that includes one` and `isLoaded` returns
`false`.

**Native, one path on each platform:** make the uri a local file, register it, check it.

- Two schemes are certain because the app can pass them directly: `file://` is used as
  is, and `http(s)://` is downloaded to `Caches/one-fonts/<sha256 of url>.<ext>`. What
  an imported font asset resolves to is not assumed. F1 starts by logging the real
  `Image.resolveAssetSource(fontId).uri` for dev and release on iOS and Android, and the
  module implements only the schemes that log shows. **INFERRED** expectation, to be
  replaced by the log: http in dev, a bundle `file://` on iOS release, a bare `raw`
  resource name on Android release (which would mean
  `resources.getIdentifier(name, "raw", packageName)` and a stream copy to the cache
  directory). No branch ships for a scheme nobody observed.
- iOS registers with `CTFontManagerRegisterFontsForURL(url, .process, &error)`.
  `kCTFontManagerErrorAlreadyRegistered` and `kCTFontManagerErrorDuplicatedName` count as
  success, then the name check above decides.
- Android calls `ReactFontManager.getInstance().addCustomFont(name, Typeface.createFromFile(file))`.
  An empty or unreadable file rejects.

**Web.** The same call works, because a font import under Vite evaluates to a URL string:
`new FontFace(name, 'url(' + uri + ')').load()` then `document.fonts.add(face)`, and
`isLoaded` is `document.fonts.check('16px "' + name + '"')`. On the server, where there
is no `document`, `load` resolves without doing anything and `isLoaded` is `false`. The
docs say plainly that a font known at build time belongs in CSS `@font-face` on web, which
avoids a swap after first paint, and that `load` is for fonts chosen at runtime.

## What prebuild stamps

```ts
native: { app: { fonts?: string[] } } // paths relative to the project root
```

The field goes in `NativeAppManifest` (`packages/one/src/native/appManifest.ts:4-35`) and
vxrn's `PrebuildAppConfig` and `validatePrebuildApp` (`prebuildWithoutExpo.ts:32,121`).
Validation: every path exists, ends in `.ttf` or `.otf`, base names are unique, and each
base name equals the file's PostScript name. A new `generateFonts` step runs next to
`generateAppIcons` and `generateSplashScreen` (`prebuildWithoutExpo.ts:645-646`).

- **Android:** copy each file to `app/src/main/assets/fonts/`. Nothing else: React
  Native finds it by name.
- **iOS:** copy each file to `<App>/Fonts/`, and have `OneNativeFonts` register every
  `.ttf` and `.otf` in `Bundle.main/Fonts` from its ObjC `+load`, with the same
  `CTFontManagerRegisterFontsForURL` call `load` uses. No `UIAppFonts` stamp and no
  pbxproj file entries. The folder reaches the app bundle through one line appended to
  the React Native bundle script phase that prebuild already patches
  (`cp -R "$PROJECT_DIR/<App>/Fonts" "$TARGET_BUILD_DIR/$UNLOCALIZED_RESOURCES_FOLDER_PATH/"`),
  added inside `patchIosBundlePhase` so it inherits that function's throw when the phase
  is missing. With no fonts listed, neither the folder nor the line exists and `+load`
  finds nothing.
- **GUESSED:** a copy made in that script phase lands before code signing and is present
  in Debug simulator builds, where the script skips bundling but still runs. F2 proves it
  on device. `UIAppFonts` with a folder reference stays a rejected alternative unless F2
  shows the script copy cannot work, and then only after `Fonts/<file>` is proven on a
  device.

Embedded fonts are usable before the first frame, so an app that lists its fonts needs no
`load` call and no loading state. The docs lead with that for ordinary apps and with
`load` for fonts chosen at runtime.

## Excluded

Family aliases (any key other than a real name of the font; this is what removes the
`UIFont` swizzle). Addressing a family by `fontWeight` across several files on Android:
it needs `res/font` XML families and generated `MainApplication` code, which is the
large half of Expo's config plugin. Variable fonts as weighted families: a variable font
loads and renders at its default weight. Font collections (`.ttc`) and `.woff`/`.woff2`
on native. `unload`, `getLoadedFonts`, `isLoading`, `renderToImageAsync`, and Expo's
server-side font registry for static rendering. `@expo-google-fonts/*` packages keep
working as plain asset imports, since they only export `.ttf` modules. Each of these can
be added later without breaking anything above.

## Size

Spec and JS about 70 lines, iOS about 100, Android about 110, prebuild about 100 with the
name reader, fixture and suite about 250, docs about 60: roughly 700. **INFERRED:** that
is the order of the approved haptics and crypto branches (`one-native-haptics`,
`one-native-random-uuid`), which are not on `v2-beta` or `v2-next` yet. No subsystem.

## Slices

1. **F1 runtime loader.** Spec, both native modules, web entry, `One.UI.Fonts` and
   `One.UI.useFonts`, the `./fonts` subpath, fixture
   `tests/native-features/fixtures/one-native-fonts.tsx`, a `fonts` entry in `suites`
   (`tests/native-features/scripts/one-native-conformance.ts`), and the Android flow
   step. The fixture ships one test font with a glyph shape no system font has (a solid
   block for `A` is enough) and renders the same string before and after `load`. The
   suite asserts, through the existing pixel gate, that the text pixels change after
   `load` resolves, that `isLoaded` flips from `false` to `true`, that a wrong key
   rejects on iOS with the font's real names in the message, and that the same wrong key
   resolves on Android (the accepted limitation, pinned). Negative control: the same
   pixel assertion fails when `load` is skipped.
   **First step of F1, before any native code:** log
   `Image.resolveAssetSource(fontId)` for dev and release on iOS and Android, four
   values, quoted in the hand-off. Font assets have no width or height, so a null here is
   possible and is itself a result. Implement exactly the schemes observed. If a release
   build does not produce a file the logged uri names, stop and send the four values
   back for a rethink. Changing the asset plugin is out of scope for this slice, since
   images share that path.
2. **F2 prebuild.** Manifest field, both validators, `generateFonts`, the name reader,
   the `+load` registration, unit tests for the reader and for the patched bundle phase
   in `prebuildWithoutExpo.test.ts`, which already covers rendered files. The fixture app
   lists a second test font in `native.app.fonts` and the suite asserts it renders and
   `isLoaded` is `true` with no `load` call, on both platforms, from a fresh prebuild.
   This slice settles the script-phase copy guess, in a Debug simulator build and a
   Release build.
3. **F3 docs and hand-off.** A `## Fonts` section in
   `apps/onestack.dev/data/docs/native-features.mdx`: the one rule first, embedded fonts,
   runtime `load`, the web note, the exclusions. Then send Contrast's owner the change
   for `font-assets.md` and `font_install`: swap the `expo-font` import for
   `One.UI.Fonts.load`, drop the `expo-font` install step. The snippets keep their
   PostScript keys, so nothing else in that skill moves.

Unit tests only where JS or build logic exists: the name table reader and the rendered
prebuild files.
