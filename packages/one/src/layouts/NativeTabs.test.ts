import { describe, expect, it, vi } from 'vitest'

vi.mock('@react-navigation/bottom-tabs', () => ({
  createBottomTabNavigator: () => ({
    Navigator: () => null,
    Screen: () => null,
  }),
}))

import { NativeTabs } from './NativeTabs'

describe('NativeTabs', () => {
  it('exposes layout statics without a separate bottom-tabs peer', () => {
    expect(() => Object.prototype.toString.call(NativeTabs)).not.toThrow()
    expect(NativeTabs.Screen).toBeTruthy()
    expect(NativeTabs.Protected).toBeTruthy()
  })
})
