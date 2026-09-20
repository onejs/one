// executable adapter contract for the zero-expo foundation.
// build-time platform entrypoints select exactly one adapter.
// runtime feature probing is never a selection mechanism.

export type OnePlatformName = 'web' | 'ios' | 'android' | 'rnx'

export type PlatformBindingEntry = {
  declarationId: string
  qualifiedName: string
}

export type PlatformBindingRegistry = Record<string, PlatformBindingEntry>

export interface OneNativePlatform {
  name: OnePlatformName
  // cohesive One.* operations above the generated bindings.
  // domains own semantics; the contract only requires the boundary shape.
  operations: Record<string, (...args: any[]) => unknown>
  // cohesive One.UI.* component entries.
  components: Record<string, unknown>
  // generated-platform registry boundary. only the matching platform
  // namespace is ever present; adapters never emulate the other platform.
  platformBindings: {
    iOS?: PlatformBindingRegistry
    Android?: PlatformBindingRegistry
  }
  capabilities: {
    supportsNativeModules: boolean
  }
}

const REQUIRED_OPERATION = 'noop'
const REQUIRED_COMPONENT = 'View'

function assertRegistry(
  registry: PlatformBindingRegistry | undefined,
  label: string
): void {
  if (!registry || typeof registry !== 'object') {
    throw new Error(`[one] platform adapter is missing ${label} registry`)
  }
  for (const [qualifiedName, entry] of Object.entries(registry)) {
    if (!entry || entry.qualifiedName !== qualifiedName || !entry.declarationId) {
      throw new Error(`[one] platform binding "${qualifiedName}" is not registered`)
    }
  }
}

export function assertPlatformAdapter(adapter: OneNativePlatform): void {
  if (!adapter || typeof adapter !== 'object') {
    throw new Error('[one] platform adapter must be an object')
  }
  if (!['web', 'ios', 'android', 'rnx'].includes(adapter.name)) {
    throw new Error(`[one] unknown platform "${(adapter as any)?.name}"`)
  }
  if (!adapter.operations || typeof adapter.operations !== 'object') {
    throw new Error(`[one] platform "${adapter.name}" is missing operations`)
  }
  if (typeof adapter.operations[REQUIRED_OPERATION] !== 'function') {
    throw new Error(
      `[one] platform "${adapter.name}" is missing required operation "${REQUIRED_OPERATION}"`
    )
  }
  if (!adapter.components || typeof adapter.components !== 'object') {
    throw new Error(`[one] platform "${adapter.name}" is missing components`)
  }
  if (!(REQUIRED_COMPONENT in adapter.components)) {
    throw new Error(
      `[one] platform "${adapter.name}" is missing required component "${REQUIRED_COMPONENT}"`
    )
  }
  const { iOS, Android } = adapter.platformBindings ?? {}
  if (adapter.name === 'web' || adapter.name === 'rnx') {
    if (iOS !== undefined || Android !== undefined) {
      throw new Error(
        `[one] platform "${adapter.name}" must not carry native bindings`
      )
    }
  }
  if (adapter.name === 'ios') {
    if (Android !== undefined) {
      throw new Error('[one] ios adapter must never emulate the Android namespace')
    }
    assertRegistry(iOS, 'iOS')
  }
  if (adapter.name === 'android') {
    if (iOS !== undefined) {
      throw new Error('[one] android adapter must never emulate the iOS namespace')
    }
    assertRegistry(Android, 'Android')
  }
  if (typeof adapter.capabilities?.supportsNativeModules !== 'boolean') {
    throw new Error(`[one] platform "${adapter.name}" is missing capabilities`)
  }
}

export function definePlatform(adapter: OneNativePlatform): OneNativePlatform {
  assertPlatformAdapter(adapter)
  return Object.freeze({
    ...adapter,
    operations: Object.freeze({ ...adapter.operations }),
    components: Object.freeze({ ...adapter.components }),
    platformBindings: Object.freeze({ ...adapter.platformBindings }),
    capabilities: Object.freeze({ ...adapter.capabilities }),
  })
}

// build-time selection. callers pass a literal platform chosen by the
// bundler define (ONE_PLATFORM), never a runtime-detected value.
export function selectOneNativePlatform(name: OnePlatformName): OneNativePlatform {
  switch (name) {
    case 'web':
      return webAdapter
    case 'ios':
      return iosAdapter
    case 'android':
      return androidAdapter
    case 'rnx':
      return rnxAdapter
    default:
      throw new Error(`[one] unknown platform "${name}"`)
  }
}

function noop(): string {
  return 'noop'
}

export const webAdapter: OneNativePlatform = definePlatform({
  name: 'web',
  operations: { noop },
  components: { View: 'View' },
  platformBindings: {},
  capabilities: { supportsNativeModules: false },
})

export const rnxAdapter: OneNativePlatform = definePlatform({
  name: 'rnx',
  operations: { noop },
  components: { View: 'View' },
  platformBindings: {},
  capabilities: { supportsNativeModules: false },
})

export const iosAdapter: OneNativePlatform = definePlatform({
  name: 'ios',
  operations: { noop },
  components: { View: 'View' },
  platformBindings: {
    iOS: {
      'UIKit.UIView.safeAreaInsets': {
        declarationId: 'apple-uikit-uiview-safeareainsets',
        qualifiedName: 'UIKit.UIView.safeAreaInsets',
      },
    },
  },
  capabilities: { supportsNativeModules: true },
})

export const androidAdapter: OneNativePlatform = definePlatform({
  name: 'android',
  operations: { noop },
  components: { View: 'View' },
  platformBindings: {
    Android: {
      'android.view.WindowInsets': {
        declarationId: 'android-view-windowinsets',
        qualifiedName: 'android.view.WindowInsets',
      },
    },
  },
  capabilities: { supportsNativeModules: true },
})
