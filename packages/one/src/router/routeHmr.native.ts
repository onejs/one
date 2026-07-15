// Native Fast Refresh for One routes.
//
// On native, RN's React Refresh can't repaint One's route components: useScreens'
// `ScreenComponent` obtains them via `value.loadRoute()` and re-wraps them
// (`fromImport` -> `forwardRef` -> `getPageExport`), so the mounted fiber isn't in
// the edited module's Refresh family. vxrn's native HMR runtime surfaces each
// committed module id to `globalThis.__VXRN_ON_MODULE_UPDATED__`; we evict One's
// route cache (bumping `useViteRoutes`' `hmrVersion` so `resolve()` re-imports the
// edited module) and bump a subscribable epoch so subscribed `ScreenComponent`s
// re-render and re-run `loadRoute()`. Web uses `routeHmr.ts` (a no-op store; the
// web path repaints via the `one-hmr-update` event, see useScreens' web block).
//
// (The web path shows RN's re-wrapping isn't the whole story — web leaf routes
// Fast-Refresh fine through the same wrapper — so the native-specific failure most
// likely lives in vxrn's own React Refresh wiring; this bypasses it for routes.)

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

if (process.env.NODE_ENV === 'development' && typeof globalThis !== 'undefined') {
  globalThis.__VXRN_ON_MODULE_UPDATED__ = (id: string) => {
    try {
      if (typeof window !== 'undefined' && (window as any).__oneRouteCache) {
        ;(window as any).__oneRouteCache.clearFile(id)
      }
    } catch {}
    routeHmrEpoch++
    routeHmrListeners.forEach((listener) => listener())
  }
}
