// main dev entry - imports all dev scripts
// this file is served as /@one/dev.js by the devtools plugin

import { createHotContext } from '/@vite/client'
import { injectIntoGlobalHook } from '/@react-refresh'

// route HMR
const routeHot = createHotContext('/__one_route_hmr')
routeHot.on('one:route-update', (data) => {
  if (window.__oneRouteCache) {
    if (data?.file) {
      window.__oneRouteCache.clearFile(data.file)
    } else {
      window.__oneRouteCache.clear()
    }
  }
  window.dispatchEvent(new CustomEvent('one-hmr-update'))
})

// loader HMR
const loaderHot = createHotContext('/__one_loader_hmr')
loaderHot.on('one:loader-data-update', async (data) => {
  if (data?.routePaths && window.__oneRefetchLoader) {
    const currentPath = window.location.pathname.replace(/\/$/, '') || '/'
    for (const routePath of data.routePaths) {
      if (routePath === currentPath) {
        try {
          await window.__oneRefetchLoader(routePath)
        } catch (err) {
          console.error('[one] Error refetching loader:', err)
        }
      }
    }
  }
})

// SSR CSS cleanup - remove SSR CSS on first HMR update so individual styles win
const ssrCssHot = createHotContext('/__clear_ssr_css')
ssrCssHot.on('vite:beforeUpdate', () => {
  document.querySelectorAll('[data-ssr-css]').forEach((node) => node.remove())
})

// react refresh
injectIntoGlobalHook(window)
window.$RefreshReg$ = () => {}
window.$RefreshSig$ = () => (type) => type

// devtools UI
import './devtools.mjs'
import './source-inspector.mjs'
