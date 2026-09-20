import { afterEach, describe, expect, test } from 'vitest'
import { One } from './one'

afterEach(() => {
  delete (globalThis as any).__ONE_PLATFORM__
})

describe('root One export', () => {
  test('imports on web with no native implementation present', () => {
    expect(One.platform).toBe('web')
    expect(One.iOS).toBeUndefined()
    expect(One.Android).toBeUndefined()
    expect(One.selectAdapter('ios').name).toBe('ios')
  })

  test('build-time platform define selects exactly one native namespace', () => {
    ;(globalThis as any).__ONE_PLATFORM__ = 'ios'
    expect(One.platform).toBe('ios')
    expect(One.iOS).toBeDefined()
    expect(One.Android).toBeUndefined()

    ;(globalThis as any).__ONE_PLATFORM__ = 'android'
    expect(One.platform).toBe('android')
    expect(One.iOS).toBeUndefined()
    expect(One.Android).toBeDefined()

    ;(globalThis as any).__ONE_PLATFORM__ = 'rnx'
    expect(One.platform).toBe('rnx')
    expect(One.iOS).toBeUndefined()
    expect(One.Android).toBeUndefined()
  })
})
