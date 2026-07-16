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
    try {
      const routeCache =
        typeof window === 'undefined' ? undefined : (window as any).__oneRouteCache
      if (typeof routeCache?.clearFile === 'function') {
        routeCache.clearFile(id)
      }
    } finally {
      routeHmrEpoch++
      routeHmrListeners.forEach((listener) => listener())
    }
  }
}
