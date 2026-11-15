import type { deviceAttestationNative as Sdk } from './backend.sdk'

// the sdk backend evaluates its framework bindings on load, so it loads on first use
export const deviceAttestationNative: typeof Sdk = () => require('./backend.sdk').deviceAttestationNative()
