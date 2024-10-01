export const isWebClient = process.env.TAMAGUI_TARGET !== 'native' && typeof window !== 'undefined'
export const isWebServer = process.env.TAMAGUI_TARGET !== 'native' && typeof window === 'undefined'
export const isNative = process.env.TAMAGUI_TARGET === 'native'
