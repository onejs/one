import { createRequire } from 'node:module'
import { describe, expect, it } from 'vitest'
import { NativeTabs } from './NativeTabs'

const require = createRequire(import.meta.url)

function hasNativeTabsPeer() {
  try {
    require.resolve('@bottom-tabs/react-navigation')
    return true
  } catch {
    return false
  }
}

describe('NativeTabs optional peer', () => {
  it('does not throw during ordinary import-time inspection', () => {
    expect(() => Object.prototype.toString.call(NativeTabs)).not.toThrow()
    expect(() => Reflect.get(NativeTabs, '$$typeof')).not.toThrow()
    expect(() => Reflect.get(NativeTabs, 'Screen')).not.toThrow()
  })

  it('keeps the missing-peer error on actual render use', () => {
    if (hasNativeTabsPeer()) return

    expect(() => (NativeTabs as any).render({}, null)).toThrow(
      'NativeTabs requires @bottom-tabs/react-navigation and react-native-bottom-tabs'
    )
  })
})
