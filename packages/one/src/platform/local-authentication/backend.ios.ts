import type { localAuthenticationNative as Sdk } from './backend.sdk.ios'

// the sdk backend evaluates its framework bindings on load, so it loads on first use
export const localAuthenticationNative: typeof Sdk = () => require('./backend.sdk.ios').localAuthenticationNative()
