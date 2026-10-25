# useSearchParams with Validation

The shipped feature (Standard Schema, discovery, typed `Link`) is specified in the Contrast plan `plans/contrast/one-search-params-schema.md`, for [issue 1039](https://github.com/onejs/one/issues/1039). The notes below predate it.

## Overview

Add a `useSearchParams` hook that provides easy access to URL search parameters with optional TanStack-style validation/parsing. This would complement the existing `useParams` (for path params) and provide type-safe search param handling.

## Expo Router Status

**Expo-router already has `useSearchParams`** (added recently). Their implementation:

```tsx
// expo-router/src/hooks.ts
export function useSearchParams({ global = false } = {}): URLSearchParams {
  const params = global ? useGlobalSearchParams() : useLocalSearchParams()
  // Filters out 'params' and 'screen' keys when global
  // Returns a ReadOnlyURLSearchParams instance
  return new ReadOnlyURLSearchParams(entries)
}
```

Key features:

- Returns `URLSearchParams` (web standard API)
- `{ global: true }` option for global vs local params
- Read-only (throws on `set()`, `append()`, `delete()`)
- No validation/parsing layer

## Current One State

One currently has:

- `useParams()` - returns dynamic route params (path segments like `[id]`)
- `useLocalSearchParams()` / `useGlobalSearchParams()` - expo-router compat, deprecated aliases
- `useActiveParams()` - returns params from the currently focused route

Missing:

- `useSearchParams` hook (expo-router has this)
- Validation/parsing layer for type coercion and defaults
- Schema-based validation (like TanStack Router's `validateSearch`)

## Proposed API

### Basic Usage

```tsx
import { useSearchParams } from 'one'

function ProductList() {
  // Returns URLSearchParams-like object
  const searchParams = useSearchParams()

  const page = searchParams.get('page') // string | null
  const sort = searchParams.get('sort') // string | null
}
```

### With Validation (TanStack-style)

```tsx
import { useSearchParams } from 'one'
import { z } from 'zod'

const searchSchema = z.object({
  page: z.coerce.number().default(1),
  sort: z.enum(['price', 'name', 'date']).default('date'),
  q: z.string().optional(),
})

function ProductList() {
  // Parsed and validated - fully typed!
  const { page, sort, q } = useSearchParams({
    schema: searchSchema,
  })

  // page is number, sort is 'price' | 'name' | 'date', q is string | undefined
}
```

### With Setter (like React Router)

```tsx
import { useSearchParams } from 'one'

function Filters() {
  const [searchParams, setSearchParams] = useSearchParams()

  const handleSort = (newSort: string) => {
    setSearchParams({ ...searchParams, sort: newSort })
    // or functional update
    setSearchParams((prev) => ({ ...prev, sort: newSort }))
  }
}
```

## Implementation Notes

### Key Differences from Path Params

| Aspect      | Path Params (`useParams`) | Search Params (`useSearchParams`) |
| ----------- | ------------------------- | --------------------------------- |
| Source      | URL path segments         | Query string                      |
| Routing     | Define routes             | Don't affect routing              |
| Persistence | Required for route match  | Optional, can be added/removed    |
| Use case    | Resource identifiers      | Filters, pagination, state        |

### React Navigation Integration

Under the hood, search params come from the navigation state. On web, they're from `window.location.search`. Need to handle:

1. **Web**: Parse from URL directly
2. **Native**: Extract from route params (everything not in the path)

## TanStack Router Comparison

TanStack Router's approach we can learn from:

```tsx
// TanStack defines search params in route definition
const productRoute = createRoute({
  path: '/products',
  validateSearch: z.object({
    page: z.number().default(1),
    sort: z.enum(['price', 'name']).default('price'),
  }),
})

// Then uses in component
function Products() {
  const { page, sort } = Route.useSearch()
}
```

Our file-based routing is different, but we can provide similar validation at the hook level.

## Loader Validation (decided 2026-10-25)

Component schemas found by the typed-link scanner also validate `searchParams` for loaders. The route-level `validateSearch` export was never consumed by the router, so One's helper is named `validateSearchParams` and a route-file export is not part of the design.

- A server-environment transform adds `__oneSearchSchemas` to a route module that exports a loader and has schemas in itself or its layouts. No schemas, no change.
- The server validates before the loader and before any `loaderCache` coalesced result, passes `searchParams`, and answers 400 on a rejected query. Document requests and client loader requests of `ssr` routes only.
- Client transport: an `ssr` page's client loader request carries the page query as `__one_search` (canonical sorted form). `loaderProps.search` for that request is that query. Loader state, preload and refetch keys are `path?canonicalQuery` for `ssr` pages; other routes keep pathname keys.
- A rejected query answers 400 on the loader request; the loader does not run and the client navigation does not commit. A document-load fallback for that case is not implemented.
- `ssr` pages skip the clientMatches fast path in useLoader because popstate does not rebuild matches.
- Limits: `ssg`, `spa` and the Vercel serverless template (no `search`, no validation) are not covered; native client URLs merge `platform` with the transport but are untested; `request` in a client loader call carries the loader URL; discovery follows static imports only.

## Related Work

- `useLocalSearchParams` exists but no validation

## Open Questions

1. Should validation schema be defined in route file or at hook call site?
2. Should we support URL-synced state (like nuqs library)?
3. How to handle arrays in search params (`?tags=a&tags=b`)?

## Priority

Medium - nice to have, improves DX for complex filtering/pagination UIs

## References

- [TanStack Router Search Params](https://tanstack.com/router/latest/docs/framework/react/guide/search-params)
- [nuqs - Type-safe search params state manager](https://nuqs.47ng.com/)
- [React Router useSearchParams](https://reactrouter.com/en/main/hooks/use-search-params)
