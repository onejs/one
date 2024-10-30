export const isWebClient = process.env.TAMAGUI_TARGET !== 'native' && typeof window !== 'undefined'
export const isWebServer = process.env.TAMAGUI_TARGET !== 'native' && typeof window === 'undefined'
export const isNative = process.env.TAMAGUI_TARGET === 'native'

export const CACHE_KEY = `${process.env.ONE_CACHE_KEY ?? Math.round(Math.random() * 100_000_000)}`

export const LOADER_JS_POSTFIX_UNCACHED = `_vxrn_loader.js`
export const LOADER_JS_POSTFIX_REGEX = new RegExp(`_\\d+${LOADER_JS_POSTFIX_UNCACHED}$`)
export const LOADER_JS_POSTFIX = `_${CACHE_KEY}${LOADER_JS_POSTFIX_UNCACHED}`

export const PRELOAD_JS_POSTFIX = `_${CACHE_KEY}_preload.js`
