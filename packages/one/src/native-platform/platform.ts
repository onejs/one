// one executable adapter contract for the zero-expo program.
// build-time platform entrypoints select exactly one adapter; runtime
// feature probing is never a selection mechanism.

export type OnePlatformKey = 'web' | 'ios' | 'android' | 'rnx'

export type OneNativePlatformKey = Exclude<OnePlatformKey, 'web'>

// cohesive domain operations above the generated bindings, keyed by domain
// (linking, device, browser, ...). domain semantics belong to the
// native-domain lane; this type only fixes the registry shape.
export type OneDomainRegistry = Record<
  string,
  Record<string, (...args: never[]) => unknown>
>

// One.UI component entries, keyed by component name.
export type OneUIEntries = Record<string, unknown>

// generated-platform registry boundary. One.ios and One.android bindings
// produced by the generator mechanism live here, namespaced per platform.
export type OneGeneratedRegistry = {
  ios: Record<string, unknown>
  android: Record<string, unknown>
}

export type OneNativePlatform = {
  readonly platform: OnePlatformKey
  readonly domains: OneDomainRegistry
  readonly ui: OneUIEntries
  readonly generated: OneGeneratedRegistry
}

const PLATFORMS: readonly OnePlatformKey[] = ['web', 'ios', 'android', 'rnx']

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  return Object.getPrototypeOf(value) === Object.prototype
}

// fails on missing required entries: platform key, domains, ui, and the
// generated ios/android registry boundary.
export function assertOneNativePlatform(
  adapter: unknown,
  label = 'OneNativePlatform'
): asserts adapter is OneNativePlatform {
  if (!isPlainRecord(adapter)) {
    throw new Error(`[${label}] adapter must be a plain object`)
  }
  if (!PLATFORMS.includes(adapter['platform'] as OnePlatformKey)) {
    throw new Error(
      `[${label}] adapter.platform must be one of ${PLATFORMS.join(', ')}`
    )
  }
  for (const key of ['domains', 'ui', 'generated'] as const) {
    if (!isPlainRecord(adapter[key])) {
      throw new Error(`[${label}] adapter.${key} is required and must be a plain object`)
    }
  }
  const generated = adapter['generated'] as Record<string, unknown>
  for (const key of ['ios', 'android'] as const) {
    if (!isPlainRecord(generated[key])) {
      throw new Error(
        `[${label}] adapter.generated.${key} is required and must be a plain object`
      )
    }
  }
}

// build-time selection: the caller names the platform explicitly (bundler
// resolve condition / entrypoint). no navigator / capability probing happens
// here by construction: there is no runtime input to probe.
export function selectOneNativePlatform(
  platform: OnePlatformKey,
  adapters: Record<OnePlatformKey, OneNativePlatform>
): OneNativePlatform {
  const adapter = adapters[platform]
  assertOneNativePlatform(adapter, `OneNativePlatform[${platform}]`)
  if (adapter.platform !== platform) {
    throw new Error(
      `[OneNativePlatform[${platform}]] adapter.platform is ${adapter.platform}`
    )
  }
  return adapter
}
