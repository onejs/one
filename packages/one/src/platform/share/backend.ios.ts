import type { shareNative as Sdk } from './backend.sdk.ios'

// the sdk backend evaluates its framework bindings on load, so it loads on first use
export const shareNative: typeof Sdk = () => require('./backend.sdk.ios').shareNative()
