import type { appTrackingNative as Sdk } from './backend.sdk.ios'

// the sdk backend evaluates its framework bindings on load, so it loads on first use
export const appTrackingNative: typeof Sdk = () => require('./backend.sdk.ios').appTrackingNative()
