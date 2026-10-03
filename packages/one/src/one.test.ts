import { afterEach, describe, expect, test } from 'vitest'
import {
  getHinge,
  getSizeClass,
  onHingeChange,
  useFonts,
  useHinge,
  useNativeState,
  useNetworkState,
  useReservedRegions,
  useReservedRegionsReady,
  useSafeAreaFrame,
  useSafeAreaInsets,
  useSizeClass,
  useSpanning,
  useWindowSegments,
} from './index'
import { One } from './one'

afterEach(() => {
  Reflect.deleteProperty(globalThis, '__ONE_PLATFORM__')
})

describe('root One export', () => {
  test('imports on web with the shared and platform namespaces typed', () => {
    expect(One.platform).toBe('web')
    expect(One.iOS.Button).toBeTypeOf('function')
    expect(One.Android.Button).toBeTypeOf('function')
    expect(One.Android.Color.material.primary).toBeNull()
    expect(One.Android.Color.dynamic.onSurface).toBeNull()
    expect(One.UI.Blur).toBeTypeOf('function')
    expect(One.UI.EdgeFade).toBeTypeOf('function')
    expect(One.UI.Icon).toBeTypeOf('function')
    expect(One.UI.Mask).toBeTypeOf('function')
    expect(One.UI.TextInput).toBeTypeOf('function')
    expect(One.UI.SafeArea.Provider).toBeTypeOf('function')
    expect(One.UI.SafeArea.View).toBeTypeOf('object')
    expect(useFonts).toBeTypeOf('function')
    expect(useNativeState).toBeTypeOf('function')
    expect(useNetworkState).toBeTypeOf('function')
    expect(useSafeAreaInsets).toBeTypeOf('function')
    expect(useSafeAreaFrame).toBeTypeOf('function')
    expect(useSizeClass).toBeTypeOf('function')
    expect(getSizeClass).toBeTypeOf('function')
    expect(useHinge).toBeTypeOf('function')
    expect(getHinge).toBeTypeOf('function')
    expect(onHingeChange).toBeTypeOf('function')
    expect(useReservedRegions).toBeTypeOf('function')
    expect(useReservedRegionsReady).toBeTypeOf('function')
    expect(useWindowSegments).toBeTypeOf('function')
    expect(useSpanning).toBeTypeOf('function')
    expect(Object.keys(One).some((name) => name.startsWith('use'))).toBe(false)
    expect(Object.keys(One.UI).some((name) => name.startsWith('use'))).toBe(false)
    expect(Object.keys(One.UI.SafeArea).some((name) => name.startsWith('use'))).toBe(false)
    expect(Object.keys(One.UI.ReservedRegions)).toEqual(['Provider'])
    expect(One.Clipboard.getString).toBeTypeOf('function')
    expect(One.Clipboard.setString).toBeTypeOf('function')
    expect(One.Clipboard.hasString).toBeTypeOf('function')
    expect(One.Network.getState).toBeTypeOf('function')
    expect(One.Network.addStateListener).toBeTypeOf('function')
    expect(One.Browser.open).toBeTypeOf('function')
    expect(One.Browser.dismiss).toBeTypeOf('function')
    expect(One.Browser.openAuthSession).toBeTypeOf('function')
    expect(One.Browser.dismissAuthSession).toBeTypeOf('function')
    expect(One.SecureStore.getItem).toBeTypeOf('function')
    expect(One.SecureStore.setItem).toBeTypeOf('function')
    expect(One.SecureStore.deleteItem).toBeTypeOf('function')
    expect(One.Haptics.selection).toBeTypeOf('function')
    expect(One.Haptics.impact).toBeTypeOf('function')
    expect(One.Haptics.notification).toBeTypeOf('function')
    expect(One.Updates.isEnabled).toBe(false)
    expect(One.Updates.check).toBeTypeOf('function')
    expect(One.Updates.fetch).toBeTypeOf('function')
    expect(One.Updates.getStaged).toBeTypeOf('function')
    expect(One.Updates.addStagedListener).toBeTypeOf('function')
    expect(One.Updates.reload).toBeTypeOf('function')
    // top-level One.AppInfo, not One.UI: application metadata is data, not UI
    expect(Object.hasOwn(One, 'AppInfo')).toBe(true)
    expect(Object.hasOwn(One.UI, 'AppInfo')).toBe(false)
    expect(Object.keys(One.AppInfo).sort()).toEqual([
      'applicationId',
      'build',
      'version',
    ])
    expect(Object.isFrozen(One.AppInfo)).toBe(true)
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
