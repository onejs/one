// native Fast Refresh for One routes
//
// vxrn calls the global hook after committing an updated module. One evicts that
// route and bumps this external-store epoch so mounted screens load fresh exports.

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
    // only refresh mounted screens when the updated module is a route. a leaf
    // Fast Refresh already patches in place; bumping this epoch re-renders every
    // ScreenComponent, and used to remount any layout that exported ErrorBoundary.
    let shouldRefresh = true
    try {
      const routeCache =
        typeof window === 'undefined' ? undefined : (window as any).__oneRouteCache
      if (typeof routeCache?.clearFile === 'function') {
        shouldRefresh = routeCache.clearFile(id) !== false
      }
    } finally {
      if (shouldRefresh) {
        routeHmrEpoch++
        routeHmrListeners.forEach((listener) => listener())
      }
    }
  }
}
