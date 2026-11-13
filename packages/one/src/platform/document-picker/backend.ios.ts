import type { documentPickerNative as Sdk } from './backend.sdk.ios'

// the sdk backend evaluates its framework bindings on load, so it loads on first use
export const documentPickerNative: typeof Sdk = (verb: string) => require('./backend.sdk.ios').documentPickerNative(verb)
