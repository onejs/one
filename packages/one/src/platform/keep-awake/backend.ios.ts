import type { keepAwakeNative as Sdk } from './backend.sdk.ios'

// the sdk backend evaluates its framework bindings on load, so it loads on first use
export const keepAwakeNative: typeof Sdk = () => require('./backend.sdk.ios').keepAwakeNative()
