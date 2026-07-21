# Headless web: removing react-native-web from One's web output

Goal: One's web build ships zero react-native-web (RNW). The router stays
universal (one route tree, react-navigation-style native), but on web every
framework-rendered element is real DOM. RNW becomes an opt-in userland compat
choice, never a framework requirement.

Researched 2026-07-20 against One @ main, the Expo monorepo clone
(expo-router 56.1.0), and current ecosystem sources.

## Why now

- RNW is in maintenance mode. Last release 0.21.2 (Oct 2025). Necolas moved
  to building React Strict DOM at Meta; Zalando migrated off. React 19
  compat is broken upstream (still calls removed `hydrate` /
  `unmountComponentAtNode`; necolas/react-native-web#2686, #2768 open, fix PR
  #2731 unmerged).
- Expo is doing the same move but hasn't finished. SDK 56 (2026-05) removed
  the react-navigation dependency by vendoring it into expo-router
  (`src/react-navigation/` + deeper `src/fork/`). RNW is now an optional peer
  dep for them. Evan Bacon (Jan 2026): next step is making RNW optional in
  expo-router so web renders react-strict-dom `<html.div>` instead of
  `<View>`. Their `NativeTabs` web view is already pure DOM
  (`NativeTabsView.web.tsx` imports only @radix-ui/react-tabs + a CSS
  module); their web modals use vaul. Default Stack/Tabs/Drawer still render
  RNW on web.
- react-navigation upstream treats web as the legacy fallback path. The
  web-specific work now happens inside Expo's fork. Waiting on upstream is
  not a path.
- Nobody ships "one route tree, native stack on native, pure DOM on web"
  today. Solito is closest and it uses two routers. One can get there first;
  the route-level pieces (`ui/` headless tabs mirroring expo-router/ui,
  `WebStackNavigator`, `ErrorBoundary.web.tsx`) already exist in the repo.

## Do we take over upstream libraries?

No takeover needed anywhere:

- react-navigation view packages (native-stack, elements, drawer,
  bottom-tabs): drop them from the web graph entirely, keep them native-only.
  Nothing to maintain.
- react-navigation logic packages: `@react-navigation/core` and
  `@react-navigation/routers` have zero react-native imports (verified in
  source). They can stay as normal deps. Vendoring them Expo-style is
  optional insurance for upgrade control, not required for headless. One
  already forks the pieces that needed changes (`fork/NavigationContainer`).
- react-native-web: exit, don't adopt. `@tamagui/react-native-web-lite`
  remains the documented compat alias for apps that still want RN primitives
  on web.
- react-native-screens: its "web support" is literally
  `const ScreenContainer = View` (RNW). Bypass on web, don't fork.
- React Strict DOM: recommend it to app authors as the shared-primitive
  layer (Meta-production-proven on web, where Expo is headed), but One core
  should not depend on it. The framework goes headless; the primitive
  library is the user's choice (RSD, Tamagui, plain JSX).

## Current coupling map (verified, file:line)

Build layer:

- `packages/vxrn/src/config/getBaseViteConfigOnly.ts:96-113` hard-codes
  `react-native` → `react-native-web` (plus safe-area → `@vxrn/safe-area`,
  deep RN paths → empty). Same alias re-applied for SSR in
  `packages/one/src/cli/build.ts:~1583-1608`.
- `packages/vxrn/src/config/getOptimizeDeps.ts` prebundles RNW,
  @react-navigation/*, react-native-screens, reanimated, css-interop.
- `createApp.tsx:126-130` uses RNW `AppRegistry` on web solely to extract
  RNW's generated style sheet for SSR.

One's own direct `react-native` imports on the web path are shallow: ~26
files, almost all just Platform / StyleSheet / View / Text / Pressable.
The deep couplings, hardest first:

1. `@react-navigation/native-stack`'s `NativeStackView` still renders the
   non-overlay portion of One's own web navigator
   (`router/web/WebStackNavigator.tsx:13`, `WebStackView.tsx:13`). Headers,
   transitions live in that package, which imports Animated/Image/View and
   `@react-navigation/elements`.
2. `@react-navigation/elements`' `SafeAreaProviderCompat` wraps every page
   (`router/useScreens.tsx:207`), on web and native alike.
3. `link/Link.tsx:66` renders RNW `Text` and relies on RNW's href-to-`<a>`
   magic plus its accessibility semantics.
4. `ui/TabSlot.tsx:2-3` uses `Screen, ScreenContainer` from
   react-native-screens with no web override.
5. Aggregate module-scope-import tax: `RootErrorBoundary.tsx` (already
   branches to plain divs on web but keeps the RN import),
   `fallbackViews/Sitemap.tsx`, `fallbackViews/Unmatched.tsx`,
   `layouts/Tabs.tsx`, `layouts/Drawer.tsx`, `stack-utils/*`,
   `useScreens.tsx`'s RouteErrorBoundary fallback. `Platform.OS` is a
   runtime read so none of it tree-shakes.
6. `@vxrn/safe-area` logic is DOM-based but renders RNW View
   (`packages/safe-area/src/SafeAreaView.tsx:2`). `@vxrn/color-scheme`
   `userScheme.ts:3` imports `Appearance` unconditionally.

Existing headless precedents in-repo: `views/ErrorBoundary.web.tsx` (pure
DOM, zero RN imports, the model to copy), `ui/` headless tabs (API mirrors
expo-router/ui), `WebStackNavigator` (web-specific but not yet RNW-free),
`next.md:75` "headless tabs, headless everything really".

## The plan

End state: `one`'s web module graph contains no `react-native` import.
The vite alias survives only as app-level compat config for userland code.

### Phase 1: mechanical web splits (small, shippable immediately)

Copy the `ErrorBoundary.web.tsx` pattern. Add pure-DOM `.web.tsx` siblings
(or build-time-constant branches that actually tree-shake) for:

- `views/RootErrorBoundary` (web markup already written inside it, just
  split the file so the RN import goes away)
- `fallbackViews/Sitemap`, `fallbackViews/Unmatched`
- `useScreens.tsx` RouteErrorBoundary fallback UI
- `views/LoadProgressBar`, `stack-utils/` header components
- Replace runtime `Platform.OS` checks in router logic files
  (`router/router.ts`, `useBlocker.ts`, `useLinkTo.tsx`) with the existing
  `process.env.TAMAGUI_TARGET === 'web'` build-time constant so branches DCE.
- `@vxrn/safe-area`: render plain divs; on web insets are
  `env(safe-area-inset-*)` CSS, no measurement tree needed for the common
  case. `@vxrn/color-scheme`: web split using matchMedia, drop `Appearance`
  from the web graph.

### Phase 2: headless Link

`Link.web.tsx` renders a real `<a>`: One already computes `hrefAttrs`,
resolved href, and onClick interception; swap `Text` for `'a'`, keep
`asChild`/Slot. Type surface moves off RN `TextProps` to
`AnchorHTMLAttributes` on web (keep the shared prop names). This kills the
single most user-visible RNW dependency and is independent of everything
else.

### Phase 3: headless web navigators (the real work)

Decision (2026-07-20, from Nate): web navigators render NOTHING. No markup,
no styles, no style/className props, no HTML chrome, no default tab bar.
Logic-only functional components plus hooks. The earlier "minimal DOM +
one-tabs- classes" approach is rejected; it recreates the RNW trap one
layer up (framework-owned markup and a props-unification problem).

- `<Stack />` on web renders the focused route's element, bare — it is a
  Slot. `<Tabs />` renders the focused tab's screen. Same layout file works
  on both platforms; native keeps the full composable props API
  (headers/toolbar), web ignores presentation config it can't honor.
- Screen preservation uses React 19.2 `<Activity mode="hidden">` (no styled
  wrapper divs). Inactive screens unmount by default.
- Custom layout = hooks (the primitives) with children-as-function sugar on
  the same components:
  `useStack() -> { focused: {key,name,params,options,element}, screens,
  navigation }`, `useTabs() -> { focused, triggers: [{name, href,
  isFocused, ...link props}] }`. The hooks are universal (thin wrappers on
  the navigation builder), so they also enable fully custom native UIs.
- The only DOM One renders on web: `Link` as `<a>` (function, not style,
  and `asChild` removes even that), and fallback/error/dev pages (404,
  error boundaries, sitemap), which legitimately need default markup.
- Styling is explicitly out of scope forever: bring Tamagui, react-strict-
  dom, or CSS. One never styles web output.
- `WebStackView`: stop delegating to `NativeStackView`, render bare
  elements per the above. No headers on web at all; header/toolbar
  composables are native-only config.
- Drop `SafeAreaProviderCompat` from `useScreens` on web.
- Drawer: native-only. A web drawer is app UI, not router responsibility.

### Phase 4: bootstrap + build

- `createApp.tsx` web/SSR path renders Root directly via react-dom, no
  `AppRegistry` (with no RNW there is no RNW style sheet to extract; the
  `__oneStyles` extraction dies with it).
- vxrn: the `react-native` → RNW alias and the RNW/screens/reanimated
  optimizeDeps entries activate only when the app opts into RNW-on-web
  (`import 'one/react-navigation-web'`, see `headless-navigators.md`; the
  build detects that import or a matching config key). Off by default for
  web-only apps. One's own packages never rely on the alias after phases
  1-3, so universal apps keep it purely for their own userland RN imports
  during migration.

### Phase 5: ecosystem posture

- Docs: "headless by default" story; recommend React Strict DOM or Tamagui
  for shared primitives in universal apps; `one/react-navigation-web`
  documented as the migration path, with the RNW maintenance-mode caveat.
- Track Expo's expo-router RNW-optional work; APIs already converge
  (`ui/` tabs) so keep naming compatible where free.

## Sequencing and cost

Phases 1-2 are days of work, independently shippable, and immediately shrink
the web bundle for every One app (RNW is roughly 60-80KB gz; FAQ already
notes core routing is under 20KB gz). Phase 3 is the real project, on the
order of a couple weeks including tests (tests/test has protected/navigation
coverage to extend). Phases 4-5 are small once 3 lands. Native output is
untouched throughout; every phase is web-only file splits or web-only view
swaps, so risk to native is near zero.

Verification gate for "done": build a One app for web and assert the client
bundle and SSR graph contain no module resolving from react-native-web
(easy to enforce as a build-time check in tests once phase 4 lands).
