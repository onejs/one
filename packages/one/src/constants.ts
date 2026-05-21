import { safeJsonStringify } from './utils/htmlEscape'
import type { One } from './vite/types'

export const isWebClient =
  process.env.TAMAGUI_TARGET !== 'native' && typeof window !== 'undefined'

export const isWebServer =
  process.env.TAMAGUI_TARGET !== 'native' && typeof window === 'undefined'

export const isNative = process.env.TAMAGUI_TARGET === 'native'

/**
 * True only in a browser main-thread context with a navigable history —
 * i.e. `window` AND `window.history` are available. Excludes native,
 * SSR, web workers / service workers (no `window`), and exotic sandboxed
 * environments where `window` exists but history is stripped. Use this
 * for guarding any `window.history` / `window.location` access so
 * intercept routes, URL masking, etc. don't assume a full browser.
 */
export const hasWebHistory =
  isWebClient &&
  typeof window.history !== 'undefined' &&
  typeof window.location !== 'undefined'

// CACHE_KEY needs to match the value baked into the deployed client bundle.
// In Cloudflare workers (and similar runtimes) the worker's static import
// graph evaluates `constants` BEFORE the user's `serve()` call gets a chance
// to pin the env, so `process.env.ONE_CACHE_KEY` is undefined at this point
// and we'd otherwise pick a fresh Math.random() per worker instance. That
// drift breaks the exact-suffix match the request handler uses to detect
// preload / loader requests.
//
// Solution: keep the postfixes as live `let` bindings (ES module live
// exports re-resolve on every read), and let `setCacheKey` rebind them
// once buildInfo arrives. Consumers reading via the module namespace
// (compiled CJS getters / ESM live binding) see the pinned value.
export let CACHE_KEY = `${process.env.ONE_CACHE_KEY ?? Math.round(Math.random() * 100_000_000)}`

export const LOADER_JS_POSTFIX_UNCACHED = `_vxrn_loader.js`
export const LOADER_JS_POSTFIX_REGEX_STRING = `_\\d+${LOADER_JS_POSTFIX_UNCACHED}$`
export const LOADER_JS_POSTFIX_REGEX = new RegExp(LOADER_JS_POSTFIX_REGEX_STRING)
export let LOADER_JS_POSTFIX = `_${CACHE_KEY}${LOADER_JS_POSTFIX_UNCACHED}`

// regex form is the defensive fallback for the rare case where CACHE_KEY
// still drifts (e.g. a deployment that bypasses setupBuildInfo). matches any
// `_<digits>_preload(_css).js` suffix so misses route through the manifest's
// graceful-empty branch instead of falling to the static 404 handler.
export let PRELOAD_JS_POSTFIX = `_${CACHE_KEY}_preload.js`
export let CSS_PRELOAD_JS_POSTFIX = `_${CACHE_KEY}_preload_css.js`
export const PRELOAD_JS_POSTFIX_REGEX = /_\d+_preload\.js$/
export const CSS_PRELOAD_JS_POSTFIX_REGEX = /_\d+_preload_css\.js$/

// called by setupBuildInfo at serve boot — rebinds all CACHE_KEY-derived
// postfixes so consumers reading them post-init get the pinned value.
export function setCacheKey(key: string): void {
  if (!key || key === CACHE_KEY) return
  CACHE_KEY = key
  LOADER_JS_POSTFIX = `_${CACHE_KEY}${LOADER_JS_POSTFIX_UNCACHED}`
  PRELOAD_JS_POSTFIX = `_${CACHE_KEY}_preload.js`
  CSS_PRELOAD_JS_POSTFIX = `_${CACHE_KEY}_preload_css.js`
}

// safari insanely aggressive caching
export const VIRTUAL_SSR_CSS_ENTRY = `virtual:ssr-css.css`
export const VIRTUAL_SSR_CSS_HREF = `/@id/__x00__${VIRTUAL_SSR_CSS_ENTRY}`

export const SERVER_CONTEXT_KEY = '__one_server_context__'

export const getSpaHeaderElements = ({
  serverContext = {},
}: {
  serverContext?: One.ServerContext
} = {}) => `
  <script>globalThis['global'] = globalThis</script>
  <script>globalThis['__vxrnIsSPA'] = true</script>
  <script>globalThis["${SERVER_CONTEXT_KEY}"] = ${safeJsonStringify(serverContext)}</script>
  <script>globalThis.__oneLoadedCSS = new Set(${safeJsonStringify(serverContext.css || [])})</script>
`
