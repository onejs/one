# One Loader Overhaul Plan

## Implementation Status

✅ **IMPLEMENTED** - The core features are now available:

- [x] `useMatches()` hook - returns all matched routes with loader data
- [x] `useMatch(routeId)` - find a specific match by route ID
- [x] `usePageMatch()` - get the current page's match
- [x] Layout loaders - layouts can export `loader()` functions
- [x] Dev server support - layout loaders run in parallel during development
- [x] Production server support - layout loaders run in parallel in production
- [x] Build system support - layout server paths included in builds
- [x] Type definitions - `One.RouteMatch` type available

### Usage

```tsx
import { useMatches, useMatch, usePageMatch } from 'one'

// in any component
function MyComponent() {
  // get all matched routes (root → layout → page)
  const matches = useMatches()

  // find a specific layout's data
  const docsMatch = useMatch('/docs/_layout')
  const navItems = docsMatch?.loaderData?.navItems

  // get the current page's data
  const pageMatch = usePageMatch()
  const headings = pageMatch?.loaderData?.headings

  return <div>...</div>
}
```

---

## The Core Problem

Layout components can't access page loader data on SSR because:

1. One runs only the leaf page's loader on the server
2. That data is passed via ServerContext to useLoader in the page
3. Layouts render before their children (React's render order)
4. There's no mechanism to pass data "up" from page to layout

**Use case**: DocsQuickNav in tamagui.dev layout needs `frontmatter.headings` from the page's loader to render statically (avoid hydration flash).

## Proposed Solution: Two Complementary Features

### 1. Layout Loaders (New Feature)

Allow `_layout.tsx` files to export a `loader` function, just like pages:

```tsx
// routes/docs/_layout.tsx
export async function loader({ params }) {
  return {
    navItems: await fetchDocsNav(),
    version: await fetchCurrentVersion()
  }
}

export default function DocsLayout({ children }) {
  const { navItems, version } = useLoader()
  return (
    <div>
      <Sidebar items={navItems} version={version} />
      {children}
    </div>
  )
}
```

### 2. useMatches Hook (Cross-Route Data Access)

Allow any component to access any matched route's loader data:

```tsx
// In any component (layout, page, or shared)
function Breadcrumbs() {
  const matches = useMatches()
  // matches = [rootLayout, docsLayout, currentPage]
  // each has { routeId, pathname, params, loaderData }
}
```

**Key distinction**: TanStack/Remix have this because ALL routes can have loaders. We're proposing the same: layouts get loaders, and `useMatches()` exposes them all.

---

## Prior Art

### Why "useMatches"?

This is the established name in both major routers:

- **TanStack Router**: [`useMatches()`](https://tanstack.com/router/v1/docs/framework/react/api/router/useMatchesHook)
- **Remix/React Router**: [`useMatches()`](https://remix.run/docs/en/main/hooks/use-matches)

The name comes from "matched routes" - when visiting `/docs/intro`, the router "matches" multiple routes: `root` → `_layout` → `docs/_layout` → `docs/intro`. These are the "matches".

`useRouteData` would imply a single route's data. `useMatches` returns the full array.

---

## How TanStack Router Solves This

### Route Matching & Loader Execution

From `load-matches.ts`:

```ts
// 1. SERIAL: beforeLoad runs top-down (parent → child)
for (let i = 0; i < inner.matches.length; i++) {
  const beforeLoad = handleBeforeLoad(inner, i)
  if (isPromise(beforeLoad)) await beforeLoad  // AWAIT each one
}

// 2. PARALLEL: loaders fire all at once
for (let i = 0; i < max; i++) {
  inner.matchPromises.push(loadRouteMatch(inner, i))  // NO await
}
const results = await Promise.allSettled(inner.matchPromises)
```

### Key Architecture Decisions

1. **beforeLoad (serial)**: Runs parent→child, each waits for previous. Used for:
   - Auth checks (redirect before children load)
   - Building context that children need
   - Can throw redirects to short-circuit

2. **loader (parallel)**: All matched routes' loaders fire via `Promise.all`. Used for:
   - Actual data fetching
   - Maximum performance (no waterfalls)

3. **useMatches() hook**: Returns ALL matched routes with their loaderData, staticData, params, etc. Any component anywhere can access any route's data.

4. **staticData**: Synchronous data defined at route creation time - available immediately without async.

---

## How Remix/React Router Solves This

### Original Problem

Loaders ran in parallel - great for perf, bad for auth/context sharing. Community requested `beforeLoader` for years.

### Solution: Middleware (now stable)

1. **Single Fetch**: Combined parallel HTTP requests into one request with shared context
2. **Middleware** runs serially before loaders
3. **Context API**: Type-safe `context.set()` / `context.get()` for parent→child data flow

```ts
// Parent middleware sets data
const userMiddleware = ({ context }) => {
  context.set(userContext, user);
};

// Child loader accesses it
export async function loader({ context }) {
  let user = context.get(userContext);
}
```

---

## Current One Architecture (Deep Research)

### Key Discovery: Layouts Already Tracked!

In `getServerManifest.ts:49,73`:

```ts
function getFlatNodes(route: RouteNode, layouts?: RouteNode[]): [string, RouteNode][] {
  if (route.children.length) {
    return route.children.flatMap((child) => {
      return getFlatNodes(child, [...(layouts || []), route])  // accumulates parent layouts!
    })
  }
  // ...
  return [[key, { ...route, layouts }]]  // layouts attached to each page route!
}
```

**This means `route.layouts` is already an array of parent RouteNodes** for every page route. We don't need to build match collection from scratch!

### Server-Side Loader Execution (`oneServe.ts:166-168`)

Currently only runs the leaf page's loader:

```ts
// Only ONE loader runs - the matched page
const exported = await import(toAbsolute(buildInfo.serverJsPath))
loaderData = await exported.loader?.(loaderProps)
```

### React Navigation Architecture

One uses dynamic React Navigation config (not static):

```ts
// useScreens.tsx:30
export const { Screen, Group } = createNavigatorFactory({} as any)()
```

This doesn't block us since:
1. Server-side doesn't use React Navigation for routing decisions
2. Route matching happens via regex in `oneServe.ts`
3. React Navigation is only used for client-side navigation and screen composition

### Client-Side Loaders

- Loaders DON'T run on client navigation (intentional, preferred)
- `useLoader` on client either:
  - Uses preloaded SSR data from ServerContext
  - Fetches loader JS and executes it (for client navigation)

### Build System: Layouts Currently Skipped!

**Critical finding** in `cli/build.ts:273`:

```ts
// Layouts are EXPLICITLY SKIPPED in the build loop!
if (!id || file[0] === '_' || file.includes('entry-server')) {
  continue
}
```

This means:
1. `_layout.tsx` files are NOT processed for `loaderServerPath`
2. Layout exports (including potential loaders) aren't included in server builds
3. We need to modify the build to include layout server bundles

---

## Implementation Plan (Detailed)

### Phase 0: Build System Changes (REQUIRED FIRST)

**Goal**: Include layout files in server build output

**Problem**: `cli/build.ts:273` skips files starting with `_`

**Solution**: Process layouts separately, store their server paths

```ts
// In cli/build.ts, after the page route loop

// Process layouts that have loaders
for (const output of serverOutputs) {
  const id = output.facadeModuleId || ''
  const file = Path.basename(id)

  // Check if this is a layout file
  if (!file.startsWith('_layout')) continue

  // Find which routes use this layout
  const layoutKey = relative(process.cwd(), id).replace(`${routerRoot}/`, '/')

  // Store the server path for this layout
  layoutServerPaths[layoutKey] = output.fileName
}

// Attach to routes
for (const route of manifest.pageRoutes) {
  if (route.layouts) {
    route.layouts = route.layouts.map(layout => ({
      ...layout,
      loaderServerPath: layoutServerPaths[layout.contextKey]
    }))
  }
}
```

**Files to modify**:
- `packages/one/src/cli/build.ts:270-320` - Don't skip `_layout`, process them
- `packages/one/src/vite/types.ts` - Add `loaderServerPath` to RouteNode type

### Phase 1: Dev Server Layout Loader Support

**Goal**: Run layout loaders during development

**Current** (`fileSystemRouterPlugin.tsx:84-88`):
```ts
// Only page loader runs in dev
if (exported.loader) {
  const tracked = await trackLoaderDependencies(() =>
    exported.loader(loaderProps)
  )
  loaderData = tracked.result
}
```

**Solution**: Import and run all layout loaders

```ts
// fileSystemRouterPlugin.tsx - new code
const allMatches = [...(route.layouts || []), route]
const matchResults = await Promise.all(
  allMatches.map(async (match) => {
    const routeFile = path.join(routerRoot, match.contextKey)
    const exported = await runner.import(routeFile)

    let loaderData
    if (exported.loader) {
      const tracked = await trackLoaderDependencies(() =>
        exported.loader(loaderProps)
      )
      loaderData = tracked.result

      // Register deps for HMR
      for (const dep of tracked.dependencies) {
        const absoluteDep = path.resolve(dep)
        if (!loaderFileDependencies.has(absoluteDep)) {
          loaderFileDependencies.set(absoluteDep, new Set())
          server?.watcher.add(absoluteDep)
        }
        loaderFileDependencies.get(absoluteDep)!.add(loaderProps?.path || '/')
      }
    }

    return {
      routeId: match.contextKey,
      params: loaderProps?.params || {},
      loaderData
    }
  })
)
```

**Files to modify**:
- `packages/one/src/vite/plugins/fileSystemRouterPlugin.tsx:74-104` - Parallel layout loaders

### Phase 2: Production Server Layout Loader Support

**Goal**: Run layout loaders in production (`oneServe.ts`)

```ts
// In oneServe.ts handlePage
const pageRoute = route
const layoutRoutes = route.layouts || []
const allMatches = [...layoutRoutes, pageRoute]

// Run all loaders in parallel
const loaderResults = await Promise.allSettled(
  allMatches.map(async (match) => {
    const exported = options?.lazyRoutes?.pages?.[match.contextKey]
      ? await options.lazyRoutes.pages[match.contextKey]()
      : await import(toAbsolute(join('./', 'dist/server', match.file)))

    return {
      routeId: match.contextKey,
      params: loaderProps.params,  // shared params from URL
      loaderData: await exported.loader?.(loaderProps),
    }
  })
)

// Filter fulfilled results
const matches = loaderResults
  .filter((r): r is PromiseFulfilledResult<RouteMatch> => r.status === 'fulfilled')
  .map(r => r.value)
```

Files to modify:
- `packages/one/src/server/oneServe.ts` - parallel execution
- `packages/one/src/vite/plugins/fileSystemRouterPlugin.tsx` - dev server support

### Phase 2: ServerContext Enhancement

**Goal**: Store all matches, not just leaf loader data

```ts
// Current (one-server-only.tsx)
interface ServerContextValue {
  loaderData?: unknown
  loaderProps?: LoaderProps
}

// New
interface ServerContextValue {
  loaderData?: unknown  // keep for backwards compat (last match's data)
  loaderProps?: LoaderProps
  matches: Array<{
    routeId: string      // e.g., "docs/_layout" or "docs/intro"
    pathname: string     // e.g., "/docs" or "/docs/intro"
    params: Record<string, string>
    loaderData: unknown
  }>
}
```

Files to modify:
- `packages/one/src/vite/one-server-only.tsx` - context type
- `packages/one/src/server/ServerContextScript.tsx` - serialization
- `packages/one/src/createApp.tsx` - pass matches to setServerContext

### Phase 3: useMatches Hook

**Goal**: Allow any component to access any route's data

```ts
// packages/one/src/useMatches.ts
import { useServerContext } from './vite/one-server-only'

export interface RouteMatch {
  routeId: string
  pathname: string
  params: Record<string, string>
  loaderData: unknown
}

export function useMatches(): RouteMatch[] {
  const context = useServerContext()
  return context?.matches ?? []
}

// Usage in layout
function DocsLayout({ children }) {
  const matches = useMatches()
  const pageMatch = matches[matches.length - 1]  // last match is current page
  const headings = pageMatch?.loaderData?.frontmatter?.headings

  return (
    <>
      <DocsQuickNav headings={headings} />
      {children}
    </>
  )
}
```

Files to create/modify:
- `packages/one/src/useMatches.ts` - new hook
- `packages/one/src/index.ts` - export

### Phase 4 (Optional): beforeLoad Support

**Goal**: Serial execution for auth/context building

```ts
// Route definition
export async function beforeLoad({ params, context }) {
  const user = await getUser()
  if (!user) throw redirect('/login')
  return { user }  // merged into context for children
}

export async function loader({ context }) {
  // context.user available from parent's beforeLoad
}
```

Implementation:
```ts
// Serial beforeLoad execution (parent → child)
let context = {}
for (const match of allMatches) {
  const exported = await importRoute(match)
  if (exported.beforeLoad) {
    const result = await exported.beforeLoad({ params, context })
    if (result) context = { ...context, ...result }
  }
}

// Then parallel loaders with accumulated context
const loaderResults = await Promise.allSettled(
  allMatches.map(match => runLoader(match, { ...loaderProps, context }))
)
```

---

## Client-Side Considerations

Since One doesn't run loaders on client navigation (intentional):

### Initial SSR → Hydration

`useMatches()` returns hydrated data from server. Works out of the box.

### Client Navigation - IMPORTANT LIMITATION

**Current behavior**: Only the navigated-to page's loader runs on client-side navigation. Layout loaders do NOT re-run.

**What this means for `useMatches()`**:
- Layout matches are cached from SSR/initial load
- Page match gets updated on client navigation
- Layout loader data becomes stale after navigation

**Example scenario**:
1. User loads `/docs/intro` → All matches populated (root, docs/_layout, intro)
2. User navigates to `/docs/guide` → Only guide's loader runs
3. `useMatches()` returns cached layout data + fresh page data

### Current Implementation

The current implementation uses a client-side store (`setClientMatches`) that needs to be called after navigation:

```ts
// This needs to be called from the navigation handler
import { setClientMatches } from 'one'

// After navigation completes
setClientMatches([
  ...cachedLayoutMatches,  // from SSR hydration
  newPageMatch,            // from client loader
])
```

**TODO**: Wire up `setClientMatches` to the navigation flow in `router.ts`

### Future Enhancement Options

1. **Cache previous matches** (current approach)
   - Fast, no extra requests
   - Stale data for layouts (acceptable for most cases - nav items, site config rarely change)
   - User can manually invalidate via `revalidateMatches()` (not yet implemented)

2. **Re-fetch all matches** (future enhancement)
   - Fresh data, slower
   - Would require layout loaders to be client-fetchable
   - Could add `revalidateMatches()` API

3. **Hybrid: re-fetch only changed segments**
   - Best of both, most complex
   - Needs segment-level change detection

**Recommendation**: Current approach is correct for most use cases. Layout data (navigation items, site config) is typically static.

---

## Files to Modify

### Core Server Changes

| File | Change |
|------|--------|
| `packages/one/src/server/oneServe.ts:149-197` | Parallel loader execution |
| `packages/one/src/vite/plugins/fileSystemRouterPlugin.tsx` | Dev server parallel loaders |
| `packages/one/src/vite/one-server-only.tsx` | Context type + matches |
| `packages/one/src/server/ServerContextScript.tsx` | Serialize matches |
| `packages/one/src/createApp.tsx:54-62` | Pass matches to context |

### New Files

| File | Purpose |
|------|---------|
| `packages/one/src/useMatches.ts` | New hook |

### Type Updates

| File | Change |
|------|--------|
| `packages/one/src/vite/types.ts` | RouteMatch type |
| `packages/one/src/router/Route.tsx:55-80` | Ensure layouts typed |

### Exports

| File | Change |
|------|--------|
| `packages/one/src/index.ts` | Export useMatches |

---

## Migration Path

### Phase 1: Non-breaking Addition

- Add `useMatches()` hook
- Existing `useLoader()` continues to work unchanged
- `loaderData` in context still contains leaf page's data (backwards compat)
- Layouts can opt-in to accessing matches

### Phase 2: Documentation

- Document `useMatches()` as preferred for layouts
- Show migration examples
- Explain when to use each

### Phase 3: Future (major version)

- Consider deprecating `useLoader()` in layouts
- All loader data access via `useMatches()`
- Keep `useLoader()` for simple page-only cases

---

## Open Questions

1. **Loader file paths**: Layout loaders may not be in `dist/server` - need to verify build output includes them

2. **Error handling**: If one loader fails, should others still complete? (recommend: yes, use `allSettled`)

3. **Streaming**: Can we start rendering with partial data? (future enhancement)

4. **Type safety**: How to get proper types for `useMatches()` return value per-route?

5. **Preloading**: Should `preloadRoute()` also preload layout loaders?

6. **Dev server**: `fileSystemRouterPlugin.tsx` also handles loaders - needs parallel support

---

## References

### External

- [TanStack Router useMatches](https://tanstack.com/router/v1/docs/framework/react/api/router/useMatchesHook)
- [TanStack Router Data Loading](https://tanstack.com/router/latest/docs/framework/react/guide/data-loading)
- [Remix useMatches](https://remix.run/docs/en/main/hooks/use-matches)
- [Remix Middleware](https://remix.run/blog/middleware)

### One Codebase

| File | Key Lines | Purpose |
|------|-----------|---------|
| `packages/one/src/server/oneServe.ts` | 149-197 | Server loader execution |
| `packages/one/src/server/getServerManifest.ts` | 46-74 | Layouts attached to routes |
| `packages/one/src/router/getRoutes.ts` | 284-339 | Route tree flattening |
| `packages/one/src/router/Route.tsx` | 55-80 | RouteNode type with layouts |
| `packages/one/src/useLoader.ts` | 176-503 | Client loader implementation |
| `packages/one/src/vite/one-server-only.tsx` | 1-176 | Server context |
| `packages/one/src/router/useScreens.tsx` | 1-573 | React Navigation integration |
