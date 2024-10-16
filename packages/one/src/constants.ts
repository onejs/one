export const isWebClient = process.env.TAMAGUI_TARGET !== 'native' && typeof window !== 'undefined'
export const isWebServer = process.env.TAMAGUI_TARGET !== 'native' && typeof window === 'undefined'
export const isNative = process.env.TAMAGUI_TARGET === 'native'

export const CACHE_KEY = `${process.env.ONE_CACHE_KEY}`
export const LOADER_JS_POSTFIX = `_${CACHE_KEY}_vxrn_loader.js`
export const PRELOAD_JS_POSTFIX = `_${CACHE_KEY}_preload.js`
