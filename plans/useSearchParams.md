# useSearchParams with Validation

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
