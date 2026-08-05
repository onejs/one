# Proposal: headless web navigators (final shape)

Status: agreed direction, 2026-07-20. Supersedes the earlier draft of this
file (renderer/render-prop architecture, then placement composition; both
rejected for API sprawl). Companion to `headless-web.md` for the RNW-exit
build work. Decided in discussion with Nate; the guiding constraint was:
keep one API, add nothing people must learn to keep doing what they do
today.

## The model

1. The API today is the API. `<Stack>`, `<Tabs>`, `<Drawer>`, `<Slot>`,
   `Screen` config children, `screenOptions`, and the composable
   `Stack.Header` / `Stack.Toolbar` work. Native behavior unchanged:
   react-navigation renders it all, exactly as now.

2. On web the same navigators are headless by default. They render the
   matched route's element and nothing else: no wrappers, no styles, no
   chrome, no tab bar. Options are still compiled per screen; on web they
   become data instead of UI.

3. App-wide rendering defaults come from a provider, registered once.

4. Fully custom layouts use one hook per navigator that returns the entire
   navigator state.

5. Old behavior (react-navigation rendering on web via RNW) is the same
   provider mechanism with a preset, imported explicitly.

No render props. No placement/slot components. No new structural layer.

## Layer by layer

### Default: headless

```tsx
// app/(tabs)/_layout.tsx — both platforms
import { Tabs } from 'one'

export default () => (
  <Tabs>
    <Tabs.Screen name="home" options={{ title: 'Home' }} />
    <Tabs.Screen name="feed" options={{ title: 'Feed' }} />
  </Tabs>
)
```

Native: bottom tabs as today. Web: the focused tab's screen renders, no tab
bar (on web your site nav is your tab bar). Dev logs a one-line note the
first time a navigator renders headless so it never reads as breakage.

Stack: focused screen; screens with a modal/sheet presentation render above
the screen below them (existing WebStackNavigator overlay logic, minus all
chrome). Drawer: focused screen; open state is navigation state, chrome is
yours. Slot: unchanged, it was always the identity.

Screens with `keepMounted` stay mounted inside React 19.2
`<Activity mode="hidden">` (no styled wrapper, effects deferred), in all
three navigators. Tabs and Drawer hold every route in state from the start,
so they only keep a screen once it has actually been focused, matching
react-navigation's lazy behavior on native. Inactive screens unmount by
default. SSR emits exactly the focused screen.

### App-wide defaults: `Presentations`

The single-place configuration layer. Plain context, consumed by the default
web renderers. One component per presentation kind, so hooks and state work
normally inside them and each gets its own prop types.

```tsx
// app/_layout.tsx — once. `web` scopes platform.
import { Presentations, Slot } from 'one'
import { Modal } from '~/interface/Modal'
import { Sheet } from '~/interface/Sheet'

export default () => (
  <Presentations web={{ sheet: Sheet, modal: Modal }}>
    <Slot />
  </Presentations>
)
```

```tsx
// any layout, no web-specific code. sheet screens use react-navigation's
// existing sheet vocabulary — the same thing you already write for native.
<Stack>
  <Stack.Screen
    name="compose"
    options={{ presentation: 'sheet', sheetAllowedDetents: [0.6, 1] }}
  />
</Stack>
```

Native maps `presentation` to the native equivalent as today; the `web` key
only configures web rendering, which is why it is platform-scoped. Keeping
the platform as a namespace leaves room for a `native` key that swaps the OS
sheet for a JS one (Tamagui, Gorhom). That is not implemented: it needs the
native stack's `presentation` mapped down to `transparentModal` so the JS
component owns the visuals. Adding it later is purely additive.

Each component receives:

```ts
type PresentationProps<Options> = {
  open: boolean
  onOpenChange: (open: boolean) => void
  // typed presentation-relevant subset of the screen's options, in
  // react-navigation's existing vocabulary (what you declare for native
  // is what you receive; no parallel prettier names — mapping to your
  // Sheet's props is your adapter's job). a narrowed view of
  // screen.options, never a copy of it
  options: Options
  screen: ScreenEntry // full entry: name, params, complete options
  children: ReactNode
}

type SheetPresentationOptions = {
  sheetAllowedDetents?: number[] | 'fitToContents'
  sheetGrabberVisible?: boolean
  sheetCornerRadius?: number
  sheetExpandsWhenScrolledToEdge?: boolean
  gestureEnabled?: boolean
  title?: string
}

type ModalPresentationOptions = { gestureEnabled?: boolean; title?: string }
```

`children` is the screen's element, already placed. `open`/`onOpenChange` is
the ecosystem-standard shape (vaul, Radix Dialog, most design-system
sheets), so adapters are one-liners. `open` mounts `false` and flips `true`
on the next commit so enter animations play. Because these are components
rather than a render callback, hooks inside them are legal, and passing
module-level components keeps the context value referentially stable.
Omitting a key keeps that kind's headless default, so apps write only what
they care about. Known kinds: `card`, `modal`, `sheet`. The native preset
maps known kinds and treats unknown kinds as modal-like.

Because it is context, sub-trees can mount their own `Presentations`
to override locally. Standard React scoping, no extra API.

### Custom layout: the hook

One hook per navigator, returning everything. Place your component as a
child of the navigator.

```tsx
import { Link, Tabs, useTabs } from 'one'

function WebTabs() {
  const { tabs, focused } = useTabs()
  return (
    <>
      <nav>
        {tabs.map((t) => (
          <Link key={t.name} href={t.href} aria-current={t.isFocused ? 'page' : undefined}>
            {t.options.title}
          </Link>
        ))}
      </nav>
      {focused.element}
    </>
  )
}

export default () => (
  <Tabs>
    <Tabs.Screen name="home" options={{ title: 'Home' }} />
    <WebTabs />
  </Tabs>
)
```

The one mechanical rule: a navigator child that is not config (not a
`Screen`/`Header`/`Toolbar` etc.) replaces the headless default on web. On
native it is ignored and the react-navigation preset renders as always, so
the same layout file works on both platforms; platform-split the custom
component if it ever needs a native variant.

Hook shapes (all screens carry the compiled options object, including
opaque passthrough of preset-specific keys):

```ts
type ScreenEntry = {
  key: string
  name: string
  params: object
  href: string
  isFocused: boolean
  keepMounted: boolean
  options: ScreenOptions      // title, presentation, header/toolbar config, ...
  element: ReactElement       // lazy; rendering it mounts the route
}

useStack()  -> { screens: ScreenEntry[]; focused: ScreenEntry; navigation }
useTabs()   -> { tabs: ScreenEntry[]; focused: ScreenEntry; navigation }
useDrawer() -> { screens: ScreenEntry[]; focused: ScreenEntry;
                 isOpen: boolean; open(); close(); toggle(); navigation }
```

Everything advanced is just what you render with this data:

- Eager mounting: map all screens, wrap unfocused in `<Activity
  mode="hidden">` (prerendered, state preserved, effects deferred) or plain
  hidden containers if they must stay fully live.
- Animated tab/stack transitions: `AnimatePresence` keyed on `focused.key`,
  or CSS view transitions (the hook controls mounting, so wrapping the
  change in `document.startViewTransition` works; a `useViewTransition`
  helper is an open item).
- Carousel tabs: render all screens in a scroll-snap row, scroll to focused.

The hooks work on native too (thin wrappers over the navigation builder),
enabling fully custom native navigator UIs, but nobody is required to know
that.

### Old behavior: the react-navigation web preset

```tsx
import 'one/react-navigation-web'
```

Registers react-navigation's web renderers as the app-wide defaults (the
same `Presentations` mechanism, preset-flavored). Requires
react-native-web installed; this import is the explicit RNW path and
replaces any config flag. Existing apps add one line during migration and
nothing changes; remove the line when ready to go headless.

## Options: the three buckets (unchanged analysis)

1. State and lifecycle (`initialRouteName`, back behavior, `keepMounted`,
   guards): core, renderer-independent, same meaning everywhere.
2. Semantic presentation (`title`, `presentation`, compiled
   Header/Toolbar config): core vocabulary. Native maps it to real chrome;
   on web it is data any custom layout can honor (a custom web layout can
   read `screen.options.toolbar` and render its own toolbar from the same
   declarative config).
3. react-navigation styling (`headerLargeTitleStyle`, `tabBarActiveTintColor`,
   animation curves, ...): stays react-navigation vocabulary, typed as
   today, meaningful on native and under the web preset. Never abstracted;
   a universal styling vocabulary is the RNW mistake in options form. On
   headless web these keys simply ride along in `options` for anyone who
   wants them.

## Every navigator, summarized

- Slot: identity everywhere. Unchanged.
- Stack: native native-stack as today. Web default: focused screen +
  presentation overlays via `Presentations`. Custom: `useStack()`.
- Tabs: native bottom-tabs as today (`react-native-bottom-tabs` remains a
  native alternative). Web default: focused screen, no bar. Custom:
  `useTabs()`.
- Drawer: native drawer as today. Web default: focused screen; `isOpen` +
  actions via `useDrawer()` for your own chrome.
- Protected, groups, dynamic routes: below this layer entirely, unaffected.

## Packaging

- `one`: navigators (same exports as today), hooks, `Presentations`,
  `Link`. The web module graph contains no react-native, react-native-web,
  react-navigation view packages, or react-native-screens (state layer
  `@react-navigation/core`/`routers` is verified RN-free and stays).
- `one/react-navigation-web`: the web preset registration (pulls RNW +
  react-navigation views; only apps that import it pay for it).
- Native continues to use the react-navigation view packages as today; they
  become dependencies of the native graph and the preset, not of web.

## Migration

- Existing apps: add `import 'one/react-navigation-web'`, everything works
  as before. Remove it to go headless when ready.
- New apps: headless by default, nothing to configure.
- No API changes on native at any point.

## Open items

1. `useViewTransition` helper now or later (renderer-side seam already
   works without it).
2. Exact dev-mode messaging when a navigator first renders headless on web.
3. Whether `web.stack`/`web.tabs` grow full renderer overrides beyond
   presentation components, or stay presentation-maps-only until a real
   need shows up (lean: presentation-maps-only, KISS; each navigator's
   override props stay navigator-specific either way).
4. A `native` key on `Presentations`, letting an app swap the OS sheet for a
   JS one. Needs the native stack's `presentation` mapped down to
   `transparentModal` so the JS component owns the visuals.
5. Not headless work, found while testing it: in a PROD build the first client
   navigation after hydration unmounts and remounts the layout, throwing away
   all layout and screen state exactly once. Verified with an ordinary group
   layout holding `useState` and no navigator of its own, so it is not specific
   to `keepMounted`, which works correctly on every navigation after the first.
   Ruled out by measurement: the route's stack key is stable across it
   (`(plain)-0` before and after), `getQualifiedRouteComponent` never misses its
   cache on the client, and the page component keeps its identity. Something
   else in the prod client tears the subtree down. `tests/test-headless-web`
   navigates once before measuring state because of this.
