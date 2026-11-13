import type { readAppInfo as Sdk } from './backend.sdk'

// the sdk backend evaluates its framework bindings on load, so it loads on first use
export const readAppInfo: typeof Sdk = () => require('./backend.sdk').readAppInfo()
