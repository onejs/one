import type { deviceNative as Sdk } from './backend.sdk'

// the sdk backend evaluates its framework bindings on load, so it loads on first use
export const deviceNative: typeof Sdk = () => require('./backend.sdk').deviceNative()
