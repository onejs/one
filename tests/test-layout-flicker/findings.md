# Layout Flash Investigation - Deep Dive

## Summary

When navigating between routes that use different headers (e.g., `/home/feed` → `/`), there's a brief flash where no header is visible. This investigation aims to deeply understand the root cause and explore potential fixes.

## The Issue

**Observed behavior:** Navigating from `/home/feed` to `/` shows the page content without any header for 1-2 frames before the correct header appears.

**Layout structure:**
```
app/_layout.tsx (SiteLayout)
  ├── SiteHeader (shown when NOT on /home/*)
  ├── Slot → children
  └── SiteFooter (shown when NOT on /home/*)

app/(app)/home/(tabs)/_layout.tsx (HomeTabsLayout)
  ├── MainHeader (always shown in this layout)
  └── Slot → feed/profile/etc
```

**The problem:** SiteHeader and MainHeader are in different layout levels. When navigating away from `/home/*`:
1. React Navigation removes the `/home/*` routes from its state
2. The nested HomeTabsLayout unmounts (MainHeader disappears)
3. SiteLayout needs to render SiteHeader (because pathname changed)
4. There's a timing gap between steps 2 and 3

## Initial Fix Found

Removing `useDeferredValue` from `useStoreRouteInfo()` in `packages/one/src/router/router.ts` fixes the issue.

**Why it was causing the flash:**
- `useDeferredValue` delays the pathname update to parent layouts
- MainHeader unmounts immediately (React Navigation's state change)
- SiteLayout's pathname is still deferred (shows old `/home/*` value)
- SiteLayout doesn't render SiteHeader because it thinks we're still on `/home/*`
- Flash! No header visible
- Eventually deferred value catches up → SiteHeader appears

## Questions to Investigate

1. ✅ Why was `useDeferredValue` added to `useStoreRouteInfo()` in the first place?
2. Does removing it cause any regressions?
3. How does React Navigation handle state transitions internally?
4. Is there a better fix at the React Navigation level?
5. How does expo-router handle this?
6. Could we fix this with View Transitions API?

## Investigation Log

### 2024-01-22 - Why useDeferredValue was added

Found in commit `762d01424` (Dec 7, 2025) - "feat(one): add web.inlineLayoutCSS to make layout css automatically inlined"

The comment in code says:
> `useDeferredValue makes the transition concurrent, preventing main thread blocking`

**Analysis:** The intent was to prevent main thread blocking during navigation by making route state updates lower priority. However:

1. During navigation, the route state IS the important thing - we want to show the new route ASAP
2. `useDeferredValue` only helps if there's other urgent work to prioritize
3. In our case, it delays the parent layout from knowing about the route change while nested layouts have already unmounted
4. This creates the flash: old header gone, new header not yet rendered because pathname is stale

**Conclusion:** Removing `useDeferredValue` from `useStoreRouteInfo()` is correct. The perf benefit was theoretical and the actual effect was causing layout flash.

Note: `useOneRouter()` and `useStoreRootState()` still use `useDeferredValue` - we only removed it from `useStoreRouteInfo()` which directly affects `usePathname()`.

---

### 2024-01-22 - Initial Investigation

**Test case created:** `tests/test-layout-flicker/`
- Minimal reproduction of the takeout.tamagui.dev layout pattern
- 7 tests that detect layout flash using MutationObserver + RAF polling
- Tests pass with the fix, fail without it

**Key files involved:**
- `packages/one/src/router/router.ts` - `useStoreRouteInfo()` with the fix
- `packages/one/src/router/RouteInfoContext.tsx` - provides route info context
- `packages/one/src/hooks.tsx` - `usePathname()` and `useRouteInfo()`

---

## React Navigation Internals

### To investigate:
- [ ] How does `useStateForPath` work?
- [ ] When does React Navigation update its internal state?
- [ ] How are SceneViews mounted/unmounted during navigation?
- [ ] What triggers the nested layout to unmount?
- [ ] Is there a way to keep old content mounted during transitions?

---

## Next Steps

1. Clone React Navigation and explore internals
2. Add logging to understand the exact sequence of events
3. Test if the fix causes any performance issues
4. Explore alternative solutions
