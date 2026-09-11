// native Fast Refresh for One routes
//
// vxrn calls the global hook after committing an updated module. One evicts that
// route from the loader cache so the next loadRoute() sees fresh exports. it
// does not bump the epoch: ScreenComponent re-running loadRoute() would render a
// new function identity and remount the route, which is what made
// `generation:1` jump to `generation:2` when a route file was Fast Refreshed.

declare global {
  // vxrn's native HMR runtime invokes this (when defined) with each committed
  // module id, so a framework can react to a hot update.
  var __VXRN_ON_MODULE_UPDATED__: ((moduleId: string) => void) | undefined
}

let routeHmrEpoch = 0
const routeHmrListeners = new Set<() => void>()

export const subscribeRouteHmr = (onStoreChange: () => void) => {
  routeHmrListeners.add(onStoreChange)
  return () => {
    routeHmrListeners.delete(onStoreChange)
  }
}

export const getRouteHmrEpoch = () => routeHmrEpoch

if (process.env.NODE_ENV === 'development') {
  globalThis.__VXRN_ON_MODULE_UPDATED__ = (id: string) => {
    try {
      const routeCache =
        typeof window === 'undefined' ? undefined : (window as any).__oneRouteCache
      if (typeof routeCache?.clearFile === 'function') {
        routeCache.clearFile(id)
      }
    } catch (error) {
      console.error('[one] route cache eviction failed', error)
    }
  }
}
