import { TurboModuleRegistry } from 'react-native'
import NativeSafeAreaProviderHost from '../specs/OneNativeSafeAreaProviderNativeComponent'
import type { Metrics } from './types'

export { NativeSafeAreaProviderHost as NativeSafeAreaProvider }
export type * from './types'
export {
  buildSafeAreaInsetStyle,
  keyboardSafeBottom,
  providerEventToMetrics,
  resolveOverlappingInsets,
  resolveSafeAreaEdgeModes,
} from './insets'

// synchronous initial metrics from the OneNativeSafeAreaContext native
// module, mirroring upstream initialWindowMetrics. the module is a legacy
// constants module on both platforms, which TurboModuleRegistry.get falls
// back to; legacy constants merge onto the module object, hence the dual
// read. null until the native side can measure, exactly like upstream
// before its first constants export.
export function getInitialWindowMetrics(): Metrics | null {
  const module = TurboModuleRegistry.get('OneNativeSafeAreaContext') as unknown as {
    getConstants?: () => { initialWindowMetrics?: unknown }
    initialWindowMetrics?: unknown
  } | null
  if (!module) return null
  const constants =
    typeof module.getConstants === 'function' ? module.getConstants() : module
  const metrics = constants?.initialWindowMetrics
  return isMetrics(metrics) ? metrics : null
}

function isMetrics(value: unknown): value is Metrics {
  if (!value || typeof value !== 'object') return false
  const { insets, frame } = value as Record<string, unknown>
  if (!insets || typeof insets !== 'object' || !frame || typeof frame !== 'object')
    return false
  const numbers = [
    (insets as Record<string, unknown>).top,
    (insets as Record<string, unknown>).right,
    (insets as Record<string, unknown>).bottom,
    (insets as Record<string, unknown>).left,
    (frame as Record<string, unknown>).x,
    (frame as Record<string, unknown>).y,
    (frame as Record<string, unknown>).width,
    (frame as Record<string, unknown>).height,
  ]
  return numbers.every((number) => typeof number === 'number' && Number.isFinite(number))
}
