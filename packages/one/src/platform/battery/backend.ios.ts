import type { batteryNative as Sdk } from './backend.sdk'

// the sdk backend evaluates its framework bindings on load, so it loads on first use
export const batteryNative: typeof Sdk = () => require('./backend.sdk').batteryNative()
