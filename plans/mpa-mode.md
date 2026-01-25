# MPA Mode (`+mpa`) Plan

## Overview

Add a new route render mode `+mpa` (Multi-Page App) that outputs pure HTML with zero client-side JavaScript. Every navigation is a full page reload - true "old school" web.

## Naming Decision

Considered: `+html`, `+static`, `+desert`, `+zero`, `+bare`

Chosen: **`+mpa`** - clear industry term, matches existing `+spa`/`+ssr`/`+ssg` pattern

## What MPA Mode Does

### Build Time
- Renders full HTML at build time (same as SSG)
- **No script tags** emitted
- **No preload JS file** generated (or generates minimal marker file)
- **No hydration** bundle
- CSS still works (inline or linked)
- Loader data still works (inlined in HTML)

### Runtime (Web)
- Page is pure HTML + CSS
- Links are plain `<a href="...">` - browser handles navigation
- Every click = full page reload
- Forms use native HTML submission

### Runtime (Native)
Two options (TBD which to implement):

**Option A: Web-only (recommended)**
- MPA routes excluded from native bundle
- Navigation to MPA route opens in system browser via `Linking.openURL()`
- Clear separation: MPA = web escape hatch

**Option B: Fallback to SSG**
- Native ignores MPA mode, treats as regular SSG
- Route works but with full React
- MPA becomes "web optimization hint"

## Mixed Mode Support

When app has both MPA and SPA/SSR/SSG routes:

### SPA/SSR → MPA Navigation
- Client router needs to detect MPA target
- Solution: MPA preload file exports `__routeType: 'mpa'`
- Router checks after preload, does `window.location.href = path` instead of SPA nav

### MPA → SPA/SSR Navigation
- No JS on MPA page to intercept
- Browser does normal navigation
- SPA/SSR page loads fresh with its JS
- **This just works naturally**

## Implementation Plan

### Phase 1: Core Build Support

1. **Add type** - `packages/one/src/vite/types.ts`
   ```ts
   export type RouteRenderMode = 'ssg' | 'spa' | 'ssr' | 'mpa'
   ```

2. **Route detection** - `packages/one/src/router/getRoutes.ts`
   - Add `mpa` to regex: `\+(api|ssg|ssr|spa|mpa)\.`

3. **Build page** - `packages/one/src/cli/buildPage.ts`
   - New branch for `type === 'mpa'`
   - Render HTML (reuse SSG render logic)
   - Skip all `<script>` tags
   - Skip preload file generation (or emit marker-only file)

### Phase 2: Mixed Mode Navigation

4. **Preload marker** - `packages/one/src/cli/buildPage.ts`
   - For MPA routes, generate minimal preload:
   ```js
   export const __routeType = 'mpa'
   ```

5. **Router detection** - `packages/one/src/router/router.ts`
   - In `doPreload()`: check for `__routeType === 'mpa'` in module
   - Return `{ __mpa: true }` marker

6. **Navigation handling** - `packages/one/src/router/router.ts`
   - In `linkTo()`: check preload result for `__mpa`
   - If true: `window.location.href = href` and return early

### Phase 3: Link Component (Optional Optimization)

7. **Build-time Link transform** - `packages/one/src/link/Link.tsx`
   - On MPA pages, Link renders as plain `<a>` with no `onClick` handler
   - Since there's no client JS, this is already true implicitly
   - But could optimize to not even include the handler code

### Phase 4: Native Support

8. **Native handling** - TBD based on chosen approach
   - Option A: Filter MPA routes from native bundle, add web redirect
   - Option B: No changes, native treats MPA as SSG

## Files to Modify

```
packages/one/src/
├── vite/types.ts              # Add 'mpa' to RouteRenderMode
├── router/getRoutes.ts        # Add 'mpa' to route detection regex
├── cli/buildPage.ts           # MPA build branch (no scripts)
├── cli/build.ts               # Handle MPA in build loop
├── router/router.ts           # Detect MPA in preload, hard refresh in linkTo
└── link/Link.tsx              # (optional) Skip onClick for MPA pages
```

## Example Usage

```
app/
  index+ssg.tsx        # SSG with hydration
  dashboard+spa.tsx    # Full SPA
  about+mpa.tsx        # Pure HTML, no JS
  blog/
    [slug]+mpa.tsx     # Static blog posts, no JS
  terms+mpa.tsx        # Legal pages, no JS needed
```

## Benefits

- **Smaller pages** - No React runtime (~40KB min), no hydration
- **Faster TTFB** - No JS parsing/execution blocking
- **SEO friendly** - Pure HTML, search engines love it
- **Accessibility** - Works without JS enabled
- **Simple content** - Perfect for blogs, docs, marketing pages

## Limitations

- No client-side interactivity (obvious)
- No client-side routing (full reload on every nav)
- Forms need server endpoints or native HTML handling
- Can't use React hooks/state on these pages (well, can author with them, but they won't update client-side)

## Open Questions

1. **Native behavior** - web-only vs fallback to SSG?
2. **generateStaticParams** - should work same as SSG for dynamic routes?
3. **Layouts** - MPA page inside layout with JS? Probably layout should also be MPA-compatible
4. **Dev mode** - how does HMR work? Probably just full reload always
