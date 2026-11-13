import type { appIconNative as Sdk } from './backend.sdk.ios'

// the sdk backend evaluates its framework bindings on load, so it loads on first use
export const appIconNative: typeof Sdk = () => require('./backend.sdk.ios').appIconNative()
