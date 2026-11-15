import type { OnePlatform } from './one-shared'

export function currentPlatform(): OnePlatform {
  const defined =
    Reflect.get(globalThis, '__ONE_PLATFORM__') ??
    (typeof process !== 'undefined' ? process.env.ONE_PLATFORM : undefined)
  return defined === 'ios' || defined === 'android' ? defined : 'web'
}
