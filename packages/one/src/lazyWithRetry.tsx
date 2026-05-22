import { type ComponentType, lazy as reactLazy, type LazyExoticComponent } from 'react'
import { loadWithRetry } from './utils/dynamicImport'

// a drop-in resilient replacement for React.lazy.
//
// React.lazy memoizes the loader's FIRST settled result — including a rejection
// (lazyInitializer sets payload._status=2 and from then on re-throws _result on
// every render WITHOUT re-invoking the loader). so a single transient
// dynamic-import chunk failure (e.g. a dev-server fetch losing a race under
// load, or a prod deploy skew) permanently poisons the lazy component for the
// whole session: with a Suspense fallback and no surrounding error boundary it
// silently renders nothing. wrapping the loader in loadWithRetry retries the
// fetch in place before React.lazy ever caches a result, and falls back to one's
// debounced reload when a chunk error is unrecoverable — so the rejection never
// reaches React.lazy's memo.
export function lazyWithRetry<T extends ComponentType<any>>(
  loader: () => Promise<{ default: T }>,
  options?: Parameters<typeof loadWithRetry>[1]
): LazyExoticComponent<T> {
  return reactLazy(() => loadWithRetry(loader, options))
}
