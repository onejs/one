import type { localAuthenticationNative as Sdk } from './backend.sdk'

// the sdk backend evaluates its framework bindings on load, so it loads on first use
export const localAuthenticationNative: typeof Sdk = () => require('./backend.sdk').localAuthenticationNative()
