import type { clipboardNative as Sdk } from './backend.sdk'

// the sdk backend evaluates its framework bindings on load, so it loads on first use
export const clipboardNative: typeof Sdk = () => require('./backend.sdk').clipboardNative()
