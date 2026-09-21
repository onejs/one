# One native fonts

**Recommendation (INFERRED):** ship `One.UI.Fonts` from `@vxrn/native/fonts`: a runtime
loader with two calls, `load` and `isLoaded`, plus a `useFonts` hook, and a
`native.app.fonts` list that prebuild embeds in the binary. The runtime loader is the
part that matters most, because a Contrast generated app runs on a prebuilt template
binary and picks its fonts after that binary exists. One rule covers both paths and both
platforms: a font is addressed by its PostScript name, one file per cut.

Scope: written design against `origin/v2-next` at `29fa071d1`. Nothing was built or run
on a device for this document.

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
  so a new bundle resource needs four pbxproj lines.

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
- Android `load` cannot check: `Typeface` has no name query. It registers under the key
  it is given. The iOS rejection is what catches a wrong key.

## API (exact surface)

```ts
// @vxrn/native/fonts, surfaced as One.UI.Fonts and One.UI.useFonts
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

**Spec.** One legacy module `OneNativeFonts`, resolved with one lazy cached
`TurboModuleRegistry.get<Spec>()`:

```ts
interface Spec extends TurboModule {
  load(name: string, uri: string): Promise<void>
  isLoaded(name: string): boolean
}
```

**JS.** The only JS logic is turning a source into a uri:
`typeof source === 'number' ? Image.resolveAssetSource(source).uri : source`, then one
`load` call per entry under `Promise.all`. React Native core already owns that
resolution, so One needs no `expo-asset`. With the native module missing, `load` rejects
with `fonts need a native build that includes @vxrn/native` and `isLoaded` returns
`false`.

**Native, one path on each platform:** make the uri a local file, register it, check it.

- The uri is one of three things. `file://` is used as is (iOS release, and any app
  supplied file). `http(s)://` is downloaded to `Caches/one-fonts/<sha256 of url>.<ext>`
  (every dev build, and remote fonts). A bare name with no scheme is an Android release
  resource: look it up with `resources.getIdentifier(name, "raw", packageName)` and copy
  the stream to the same cache directory.
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
- **iOS:** copy each file to `<App>/Fonts/`, add `UIAppFonts` to `Info.plist` with one
  `Fonts/<file>` string per font (inserted before `LSRequiresIPhoneOS`, the anchor the
  scheme stamp already uses at `prebuildWithoutExpo.ts:456-470`), and add `Fonts` to the
  Xcode project once as a folder reference, so the pbxproj change is four lines however
  many fonts there are. Each line goes after its `Images.xcassets` sibling
  (build file `:11`, file reference `:18`, group child `:44`, resources phase `:161`)
  with two fixed ids, and prebuild throws when any of the four anchors is missing, the
  way `patchIosBundlePhase` already does. A template bump that moves them fails the
  build instead of shipping an app without its fonts.
- **GUESSED:** `UIAppFonts` accepts a `Fonts/<file>` subpath for a folder reference.
  F2 proves it on device. If it does not, the fallback keeps the folder reference and
  has `OneNativeFonts` register every file in `Bundle.main/Fonts` from `+load`; do not
  switch to per-file pbxproj entries.

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

Spec and JS about 70 lines, iOS about 90, Android about 110, prebuild about 125 with the
name reader, fixture and suite about 250, docs about 60: roughly 700, the size of haptics
or crypto. No subsystem.

## Slices

1. **F1 runtime loader.** Spec, both native modules, web entry, `One.UI.Fonts` and
   `One.UI.useFonts`, the `./fonts` subpath, fixture
   `tests/native-features/fixtures/one-native-fonts.tsx`, a `fonts` entry in `suites`
   (`tests/native-features/scripts/one-native-conformance.ts`), and the Android flow
   step. The fixture ships one test font with a glyph shape no system font has (a solid
   block for `A` is enough) and renders the same string before and after `load`. The
   suite asserts, through the existing pixel gate, that the text pixels change after
   `load` resolves, that `isLoaded` flips from `false` to `true`, and that a wrong key
   rejects on iOS with the font's real names in the message. Negative control: the same
   pixel assertion fails when `load` is skipped.
   **Probes inside F1, each a go or no-go:**
   - dev build on both platforms: `Image.resolveAssetSource(fontId).uri` is an http url
     the module can download (**INFERRED** from the asset plugin; font assets have no
     width or height, confirm the resolver does not need them);
   - release build on both platforms: the uri is a bundle `file://` on iOS and a bare
     `raw` resource name on Android (**INFERRED** from `copyNativeAssetFiles`). If the
     release copy does not produce what the resolver names, fix the asset plugin, since
     images share that path.
2. **F2 prebuild.** Manifest field, both validators, `generateFonts`, the name reader,
   unit tests for the reader and for the rendered `Info.plist` and pbxproj in
   `prebuildWithoutExpo.test.ts`, which already covers rendered files. The fixture app
   lists a second test font in `native.app.fonts` and the suite asserts it renders and
   `isLoaded` is `true` with no `load` call, on both platforms, from a fresh prebuild.
   This slice settles the `UIAppFonts` subpath guess.
3. **F3 docs and hand-off.** A `## Fonts` section in
   `apps/onestack.dev/data/docs/native-features.mdx`: the one rule first, embedded fonts,
   runtime `load`, the web note, the exclusions. Then send Contrast's owner the change
   for `font-assets.md` and `font_install`: swap the `expo-font` import for
   `One.UI.Fonts.load`, drop the `expo-font` install step. The snippets keep their
   PostScript keys, so nothing else in that skill moves.

Unit tests only where JS or build logic exists: the name table reader and the rendered
prebuild files.
