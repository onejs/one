import type { fontsNative as Sdk } from './backend.sdk.ios'

// the sdk backend evaluates its framework bindings on load, so it loads on first use
export const fontsNative: typeof Sdk = () => require('./backend.sdk.ios').fontsNative()
