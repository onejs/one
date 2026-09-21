import { afterEach, describe, expect, test } from 'vitest'
import { One } from './one'

afterEach(() => {
  Reflect.deleteProperty(globalThis, '__ONE_PLATFORM__')
})

describe('root One export', () => {
  test('imports on web with the shared and platform namespaces typed', () => {
    expect(One.platform).toBe('web')
    expect(One.iOS.Button).toBeTypeOf('function')
    expect(One.Android.Button).toBeTypeOf('function')
    expect(Object.hasOwn(One.Android, 'Color')).toBe(false)
    expect(One.UI.Blur).toBeTypeOf('function')
    expect(One.UI.EdgeFade).toBeTypeOf('function')
    expect(One.UI.Icon).toBeTypeOf('function')
    expect(One.UI.Mask).toBeTypeOf('function')
    expect(One.UI.TextInput).toBeTypeOf('function')
    expect(One.UI.SafeArea.Provider).toBeTypeOf('function')
    expect(One.UI.SafeArea.View).toBeTypeOf('object')
    expect(One.UI.SafeArea.useInsets).toBeTypeOf('function')
    expect(One.UI.Haptics.selection).toBeTypeOf('function')
    expect(One.UI.Haptics.impact).toBeTypeOf('function')
    expect(One.UI.Haptics.notification).toBeTypeOf('function')
  })

  test('reports the build-time platform without reshaping the API', () => {
    Reflect.set(globalThis, '__ONE_PLATFORM__', 'ios')
    expect(One.platform).toBe('ios')

    Reflect.set(globalThis, '__ONE_PLATFORM__', 'android')
    expect(One.platform).toBe('android')

    Reflect.set(globalThis, '__ONE_PLATFORM__', 'rnx')
    expect(One.platform).toBe('rnx')
    expect(One.iOS.Button).toBeTypeOf('function')
    expect(One.Android.Button).toBeTypeOf('function')
  })
})
