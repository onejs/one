# Expo Router Audit: Changes from Sep 2025 - Mar 2026

Audit of 240 commits to `expo-router` in the last 6 months, compared against One framework's forked files.

## Shared Files Between Expo Router and One

Files that One has forked from expo-router (in `packages/one/src/`):

| Directory  | Shared Files                                                                                                                                                                               |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `fork/`    | `extractPathFromURL.ts`, `findFocusedRoute.tsx`, `getPathFromState.ts`, `getStateFromPath.ts`, `NavigationContainer.tsx`, `useLinking.native.ts`, `useLinking.ts`, `validatePathConfig.ts` |
| `layouts/` | `Drawer.tsx`, `Stack.tsx`, `Tabs.tsx`, `withLayoutContext.tsx`, `stack-utils/*`                                                                                                            |
| `link/`    | `href.ts`, `Link.tsx`, `linking.ts`, `Redirect.tsx`, `useLoadedNavigation.ts`                                                                                                              |
| `views/`   | `EmptyRoute.tsx`, `ErrorBoundary.tsx`, `Navigator.tsx`, `Protected.tsx`, `Screen.tsx`, `Try.tsx`                                                                                           |
| `ui/`      | `common.tsx`, `index.ts`, `Slot.tsx`, `TabContext.tsx`, `TabList.tsx`, `TabRouter.tsx`, `Tabs.tsx`, `TabSlot.tsx`, `TabTrigger.tsx`, `useComponent.tsx`                                    |
| `head/`    | `index.ts`, `url.tsx`                                                                                                                                                                      |
| `utils/`   | `children.ts`, `style.ts`, `url.ts`                                                                                                                                                        |
| root       | `constants.ts`, `getReactNavigationConfig.ts`, `types.ts`, `useFocusEffect.ts`, `import-mode/index.ts`                                                                                     |

Note: One's fork files have diverged in code style (no semicolons, different imports) and architecture (uses `-mods.ts` suffix files instead of `-forks.ts`).

---

## CRITICAL: Bugs/Security Fixes to Adopt Immediately

### 1. Fix params mutation in getPathDataFromState

- **Commit:** `958a11c9e` (#43934)
- **File:** `fork/getPathFromState.ts`
- **Bug:** `getPathDataFromState` was mutating the params object passed as argument by using `delete` directly on `focusedRoute.params`. Should be a shallow copy first.
- **One has this bug:** YES - at line 333 of `fork/getPathFromState.ts`, `focusedParams = focusedRoute.params` assigns by reference.
- **Fix:** Change `focusedParams = focusedRoute.params` to `focusedParams = { ...focusedRoute.params }`
- **Priority:** CRITICAL - can cause subtle navigation state corruption

### 2. Fix regex for routes with multiple spaces

- **Commit:** `fe564e021` (#43935)
- **File:** `fork/getStateFromPath-forks.ts` (One: `fork/getStateFromPath-mods.ts`)
- **Bug:** `.replace(' ', '%20')` only replaces the first space. Routes with multiple spaces (e.g., `my super route.tsx`) fail to match.
- **One has this bug:** YES - at line 288 of `fork/getStateFromPath-mods.ts`
- **Fix:** Change `.replace(' ', '%20')` to `.replace(/ /g, '%20')`
- **Priority:** CRITICAL - broken routing for any multi-space file names

### 3. Fix hash order to be RFC compliant

- **Commit:** `7942d1e0b` (#43933)
- **File:** `fork/useLinking.ts`
- **Bug:** `location.pathname + location.search` omits the hash fragment, so hash-based navigation breaks on web.
- **One has this bug:** YES - at line 236 of `fork/useLinking.ts`
- **Fix:** Append `+ (location.hash ?? '')` to the path construction
- **Priority:** CRITICAL - hash fragments lost during navigation on web

### 4. Handle empty routes manifest gracefully

- **Commit:** `910bc2860` (#43606)
- **File:** `getReactNavigationConfig.ts`
- **Bug:** When no routes exist (intermediary state), `getReactNavigationConfig` throws instead of returning empty config.
- **One should adopt:** YES
- **Fix:** Accept `RouteNode | null` param, return `{ screens: {} }` when null
- **Priority:** CRITICAL - prevents cryptic build failures

---

## IMPORTANT: Features/Improvements to Adopt Soon

### 5. Fix Stack.Protected not applying to index routes

- **Commit:** `277b5af1e` (#43769)
- **Files:** `layouts/withLayoutContext.tsx`, and useScreens (expo-only file)
- **What:** Protected screens failed when screen name didn't have `/index` suffix (e.g., `otp/[flow]` vs `otp/[flow]/index`)
- **Fix:** Normalize names by stripping `/index` suffix when comparing protected screen names
- **One should adopt:** YES - the withLayoutContext.tsx fix is directly applicable

### 6. Head component stale title on tab navigation

- **Commit:** `c06bc1553` (#42681)
- **File:** `head/ExpoHead.tsx` (One has different Head implementation)
- **Bug:** `<Head>` doesn't update document title when switching tabs on web because cached screens stay mounted.
- **Fix:** Conditionally render `<Helmet>` based on `useIsFocused()` state
- **One should adopt:** MAYBE - check if One's Head has same issue

### 7. Fix useLocalSearchParams type for routes without params

- **Commit:** `48ebd8e88` (#41301)
- **File:** `typed-routes/types.ts`
- **Bug:** `useLocalSearchParams<'/static/route', { extra?: string }>()` returns `never` type for `extra` on routes without path params
- **Fix:** Change `H extends Record<'pathname' | 'params', any>` to `H extends { pathname: any; params?: any }`
- **One should adopt:** YES if One uses typed routes

### 8. Replace action handling in headless tabs

- **Commit:** `7335d13ea` (#41815)
- **File:** `ui/TabRouter.tsx`
- **Bug:** TabRouter for `expo-router/ui` didn't handle `REPLACE` action, causing broken `router.replace()` in tabs
- **Fix:** Add `REPLACE` action type handling that converts to `JUMP_TO`
- **One should adopt:** YES - this is a real user-facing bug

### 9. Headless tabs focused navigation unification

- **Commit:** `507dc7d32` (#42235)
- **File:** `ui/TabTrigger.tsx`
- **Bug:** Headless tabs dispatched navigation action even when tab was already focused, unlike JS tabs
- **Fix:** Guard `switchTab()` with `if (!trigger.isFocused)`
- **One should adopt:** YES - prevents unnecessary re-renders and navigation events

### 10. `reset` renamed to `resetOnFocus` in headless tabs

- **Commit:** `2d14c5845` (#40349)
- **Files:** `ui/TabRouter.tsx`, `ui/TabTrigger.tsx`, `ui/Tabs.tsx`
- **What:** The `reset` prop caused many issues. Replaced with simpler `resetOnFocus` boolean
- **One should adopt:** YES - breaking change but fixes real bugs; coordinate with next major

### 11. Navigation action target computed at dispatch time

- **Commit:** `8b117f3a8` (#39682)
- **Files:** global-state (One's equivalent: `router/` directory)
- **Bug:** Navigation during first render or first effect phase used stale/partial state because target was computed too early
- **Fix:** Move target computation to when action is actually dispatched from routing queue
- **One should adopt:** YES - fixes "navigate during first render" bugs

### 12. State update via onStateChange instead of addListener('state')

- **Commit:** `77bb9daa8` (#40261)
- **Files:** `ExpoRoot.tsx` (One: `Root.tsx`), global-state
- **Bug:** `addListener('state')` emitted partial states, causing stale `usePathname` and `useSegments` values
- **Fix:** Use `onStateChange` callback which always emits full state
- **One should adopt:** YES - fixes stale hook values

### 13. Fix withAnchor for deeply nested routes

- **Commit:** `dc9d8dc6e` (#40528)
- **Files:** link/linking.ts (One has this file)
- **Bug:** When using `withAnchor` to navigate to deeply nested routes, anchor was only loaded at root level
- **Fix:** Propagate `initial` parameter through all nested `params` objects
- **One should adopt:** MAYBE - depends on whether One supports `withAnchor`

### 14. Throw error when array style passed to Slot

- **Commit:** `e22c06f18` (#41901)
- **File:** `ui/Slot.tsx`
- **What:** Array styles silently fail on web with Slot/asChild. Now throws clear error in dev
- **One should adopt:** YES - improves DX with actionable error message

---

## NICE-TO-HAVE: Consider for Future

### 15. Detect incorrect screen presentation

- **Commit:** `eebc123f4` (#42829)
- **What:** Warns when screen presentation configuration is likely wrong
- **One should adopt:** MAYBE

### 16. Use constants for internal param names

- **Commit:** `27e22e14a` (#41082)
- **What:** Replace magic strings with constants for internal expo router params
- **One should adopt:** MAYBE - good code quality improvement

### 17. Replace mock URL base with `file:` protocol

- **Commits:** `93a307e24` (#41338), `5025f5ba8` (#41506)
- **Files:** `fork/getStateFromPath-forks.ts`
- **What:** Changed dummy `https://phony.example` URL to `file:` to avoid code scanner false positives
- **One should adopt:** MAYBE - mostly cosmetic, avoids scanner warnings

### 18. Emit tabPress on tab change

- **Commit:** `b68a417eb` (#41159)
- **What:** Emit `tabPress` event when tab changes in native tabs
- **One should adopt:** MAYBE - if One has native tabs

### 19. Android state restoration for activity recreation

- **Commit:** `6ac81f63d` (#42644)
- **File:** `fork/useLinking.native.ts`
- **What:** Improved Android state restoration and reduced spurious linking warnings
- **One should adopt:** YES for native - preserves user navigation after activity recreation

### 20. Add `removeParams` function

- **Commit:** `81fd982b8` (#41140)
- **File:** `navigationParams.ts`
- **What:** Utility to remove specified params at all nesting levels
- **One should adopt:** MAYBE - useful utility if needed

### 21. Synchronous layout updates from screens

- **Commit:** `ebfda48af` (#42154)
- **What:** Enables synchronous layout for react-native-screens, fixing `flex: 1` in formSheet
- **One should adopt:** MAYBE - depends on react-native-screens version

### 22. iosPreventReattachmentOfDismissedScreens

- **Commit:** `12cb43b7d` (#43001)
- **What:** Activates fix from react-native-screens to prevent reattachment of dismissed screens
- **One should adopt:** MAYBE - depends on react-native-screens version

---

## SKIP: Not Applicable to One

### Native-only features (iOS Zoom Transition, Native Tabs, Toolbar, etc.)

~80 commits related to:

- iOS zoom transition support (`141492e34`, `c61d253ea`, `3cb13dedb`, many more)
- Native tabs (NativeTabs component, Material 3 colors, xcassets, etc.)
- Stack toolbar / header items component API (`5163821ce`, `ab722615d`, `33a98be6e`, `02a7fdd4b`, many more)
- iOS split view layout (`25a1d180e`, `a8291c358`)
- Link preview / context menu features
- Color API utility (`22cc74950`)
- iOS-specific native components and podspec changes

These are Expo-specific native features that don't apply to One's web-focused architecture.

### Expo ecosystem changes

- React Navigation upgrades (One manages its own versions)
- react-native-screens upgrades
- RSC/react-server-dom-webpack changes
- Migration of code between expo-router and @expo/router-server
- Typed routes migration to @expo/router-server
- `expo-server` (formerly `@expo/server`) refactoring
- Removing deprecated `ExpoRequest`/`ExpoResponse` types
- `expo-doctor` checks
- SDK version bumps

### Expo's loader system changes

Expo has been building out a server data loader system (commits `33dad7e41`, `ee9fc5dee`, `7c4a08a68`, `a038cef98`, `5e5874a6b`, many more). One already has its own mature loader system (`useLoader`, `createHandleRequest`, etc.) which is architecturally different. These changes are:

- Expo's `useLoaderData()` hook and related bug fixes
- Loader function signature change to `(request, params)`
- SSR improvements for loader data
- Keying loader data by `contextKey` instead of URL pathname

**Reason to skip:** One's loader architecture is different and more mature. However, some of the _bug patterns_ (e.g., search params preservation, nested index path resolution) might be informative.

### Documentation/testing-only changes

- Claude.md addition to expo-router
- Doc updates, test cleanup, changelog entries
- `@testing-library/react-native` bumps

---

## Prioritized Implementation Plan

### Phase 1: Critical Bug Fixes (do now)

1. **Params mutation fix** in `fork/getPathFromState.ts` - 1 line change
2. **Multi-space regex fix** in `fork/getStateFromPath-mods.ts` - 1 line change
3. **Hash fragment fix** in `fork/useLinking.ts` - 1 line change
4. **Empty routes manifest** in `getReactNavigationConfig.ts` - small change

### Phase 2: Important Improvements (next sprint)

5. **Stack.Protected index route fix** in `layouts/withLayoutContext.tsx`
6. **TabRouter REPLACE action** in `ui/TabRouter.tsx`
7. **Tab trigger focused guard** in `ui/TabTrigger.tsx`
8. **Slot array style error** in `ui/Slot.tsx`
9. **State update via onStateChange** - requires understanding One's Root.tsx architecture

### Phase 3: Architecture Alignment (planned)

10. **resetOnFocus rename** in headless tabs (breaking change)
11. **Navigation action dispatch timing** fix
12. **useLocalSearchParams type fix** in typed-routes
13. **Android state restoration** in useLinking.native.ts

### Phase 4: Nice-to-have (backlog)

14. Internal param name constants
15. `file:` URL base replacement
16. `removeParams` utility
17. Screen reattachment prevention flag
