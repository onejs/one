import type { One } from './vite/types'

export const isWebClient = process.env.TAMAGUI_TARGET !== 'native' && typeof window !== 'undefined'
export const isWebServer = process.env.TAMAGUI_TARGET !== 'native' && typeof window === 'undefined'
export const isNative = process.env.TAMAGUI_TARGET === 'native'

export const CACHE_KEY = `${process.env.ONE_CACHE_KEY ?? Math.round(Math.random() * 100_000_000)}`

export const LOADER_JS_POSTFIX_UNCACHED = `_vxrn_loader.js`
export const LOADER_JS_POSTFIX_REGEX_STRING = `_\\d+${LOADER_JS_POSTFIX_UNCACHED}$`
export const LOADER_JS_POSTFIX_REGEX = new RegExp(LOADER_JS_POSTFIX_REGEX_STRING)
export const LOADER_JS_POSTFIX = `_${CACHE_KEY}${LOADER_JS_POSTFIX_UNCACHED}`

export const PRELOAD_JS_POSTFIX = `_${CACHE_KEY}_preload.js`
export const CSS_PRELOAD_JS_POSTFIX = `_${CACHE_KEY}_preload_css.js`

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
  <script>globalThis["${SERVER_CONTEXT_KEY}"] = ${JSON.stringify(serverContext)}</script>
  <script>globalThis.__oneLoadedCSS = new Set(${JSON.stringify(serverContext.css || [])})</script>
`
