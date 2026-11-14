import type { brightnessNative as Sdk } from './backend.sdk'

// the sdk backend evaluates its framework bindings on load, so it loads on first use
export const brightnessNative: typeof Sdk = () => require('./backend.sdk').brightnessNative()
