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

// route load errors. the router catches a failed route import and substitutes an
// empty component so one bad route cannot take down the whole app. in dev that
// resilience hides the cause: a broken import surfaced as a single console line
// while the app rendered nothing, and every provider mounted inside that route
// (sync, auth, theme) silently never started. report it to the dev server for a
// terminal line, and paint it here so the blank screen explains itself.
const routeErrorHot = createHotContext('/__one_route_error')

const ROUTE_ERROR_TAG = 'one-route-error-overlay'

function showRouteErrorOverlay(detail) {
  document.querySelector(ROUTE_ERROR_TAG)?.remove()
  const host = document.createElement(ROUTE_ERROR_TAG)
  host.style.cssText = 'position:fixed;inset:0;z-index:2147483647'
  const shadow = host.attachShadow({ mode: 'open' })
  shadow.innerHTML = `
    <style>
      .backdrop {
        position: fixed; inset: 0; overflow: auto;
        background: rgba(0,0,0,.66); backdrop-filter: blur(2px);
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      }
      .panel {
        margin: 8vh auto; max-width: 900px; width: calc(100% - 48px);
        background: #18181b; color: #fafafa; border: 1px solid #f87171;
        border-radius: 10px; padding: 22px 24px; box-shadow: 0 24px 60px rgba(0,0,0,.5);
      }
      h1 { margin: 0 0 4px; font-size: 15px; color: #f87171; letter-spacing: .01em; }
      .id { margin: 0 0 14px; font-size: 13px; color: #a1a1aa; word-break: break-all; }
      .msg {
        margin: 0 0 14px; padding: 12px 14px; background: #0c0c0e; border-radius: 6px;
        font-size: 13px; line-height: 1.55; white-space: pre-wrap; word-break: break-word;
      }
      .why { margin: 0 0 16px; font-size: 12.5px; line-height: 1.6; color: #d4d4d8; }
      pre {
        margin: 0; padding: 12px 14px; background: #0c0c0e; border-radius: 6px;
        font-size: 11.5px; line-height: 1.5; color: #a1a1aa;
        white-space: pre-wrap; word-break: break-word; max-height: 34vh; overflow: auto;
      }
      button {
        position: absolute; top: 14px; right: 16px; background: none; border: 0;
        color: #a1a1aa; font-size: 20px; line-height: 1; cursor: pointer; padding: 4px 8px;
      }
      button:hover { color: #fafafa; }
      .wrap { position: relative; }
    </style>
    <div class="backdrop">
      <div class="panel wrap">
        <button title="dismiss">&times;</button>
        <h1>Route failed to load</h1>
        <p class="id"></p>
        <p class="msg"></p>
        <p class="why">
          The router rendered an empty component in its place, so nothing inside this
          route mounted — including any providers it wraps. Fix the import above and
          this overlay will clear on reload.
        </p>
        <pre></pre>
      </div>
    </div>
  `
  shadow.querySelector('.id').textContent = detail?.id || 'unknown route'
  shadow.querySelector('.msg').textContent = detail?.message || 'unknown error'
  const stack = shadow.querySelector('pre')
  if (detail?.stack) stack.textContent = detail.stack
  else stack.remove()
  // dismiss clears the stored copy too, or the next reload repaints it
  shadow.querySelector('button').addEventListener('click', clearRouteErrorOverlay)
  document.documentElement.appendChild(host)

  // a failed route makes the client render null where the server rendered the
  // real route, so react hits a hydration mismatch and recovers by re-rendering
  // from scratch. that recovery calls clearContainerSparingly on the root
  // container, which here is <html>, so it strips this overlay out about a
  // second after it appears — the reason the error stayed invisible. put it back
  // once react is done. bounded and short-lived so it can never fight the app.
  let readds = 0
  const keepAlive = new MutationObserver(() => {
    if (host.isConnected || readds >= 3) return
    readds++
    document.documentElement.appendChild(host)
  })
  keepAlive.observe(document.documentElement, { childList: true })
  setTimeout(() => keepAlive.disconnect(), 10000)
}

// a failed route makes the client render null where the server rendered the real
// route, so react reports a hydration mismatch and the page full-reloads. that
// reload wipes the overlay within a second of it appearing, and the reloaded page
// resolves the route from cache without failing again, so nothing repaints it.
// hold the error for the tab and repaint after the reload, the way vite replays
// server errors to a reconnecting client. cleared by any successful hot update.
const ROUTE_ERROR_KEY = 'one:last-route-error'

function clearRouteErrorOverlay() {
  try {
    sessionStorage.removeItem(ROUTE_ERROR_KEY)
  } catch {}
  document.querySelector(ROUTE_ERROR_TAG)?.remove()
}

function paintRouteError(detail) {
  try {
    showRouteErrorOverlay(detail)
  } catch (err) {
    console.error('[one] could not render the route error overlay:', err)
  }
}

window.__oneReportRouteLoadError = (detail) => {
  routeErrorHot.send('one:route-error', detail)
  try {
    sessionStorage.setItem(ROUTE_ERROR_KEY, JSON.stringify(detail))
  } catch {}
  paintRouteError(detail)
}

routeErrorHot.on('vite:afterUpdate', clearRouteErrorOverlay)

try {
  const stored = sessionStorage.getItem(ROUTE_ERROR_KEY)
  if (stored) {
    if (document.body) paintRouteError(JSON.parse(stored))
    else {
      document.addEventListener(
        'DOMContentLoaded',
        () => paintRouteError(JSON.parse(stored)),
        { once: true }
      )
    }
  }
} catch {}

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
