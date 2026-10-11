import { afterEach, describe, expect, it, vi } from 'vitest'
import { Brightness } from '../src/platform/brightness/index'

vi.mock('react-native-nitro-modules', () => ({
  NitroModules: { createHybridObject: vi.fn() },
}))

afterEach(() => {
  vi.unstubAllGlobals()
})

async function loadNativeEntry(hybrid: unknown) {
  vi.resetModules()
  const { NitroModules } = await import('react-native-nitro-modules')
  vi.mocked(NitroModules.createHybridObject).mockReturnValue(hybrid as never)
  return import('../src/platform/brightness/index.native')
}

describe('brightness web', () => {
  it('resolves the assume-full contract without a brightness api', async () => {
    expect(await Brightness.get()).toBe(1)
    await Brightness.set(0.5)
    expect(await Brightness.getSystem()).toBe(1)
    await Brightness.setSystem(0.5)
    expect(await Brightness.getSystemMode()).toBe('unknown')
    await Brightness.setSystemMode('manual')
    expect(await Brightness.isUsingSystem()).toBe(true)
    await Brightness.restoreSystem()
    expect(await Brightness.getPermissions()).toEqual({
      status: 'denied',
      granted: false,
      canAskAgain: false,
    })
    expect(await Brightness.requestPermissions()).toEqual({
      status: 'denied',
      granted: false,
      canAskAgain: false,
    })
    expect(Brightness.isAvailable()).toBe(false)
  })

  it('throws synchronously for out-of-range values and bad modes', () => {
    expect(() => Brightness.set(-0.1)).toThrow(
      'Brightness.set: value must be a number between 0 and 1'
    )
    expect(() => Brightness.setSystem(2)).toThrow(
      'Brightness.setSystem: value must be a number between 0 and 1'
    )
    expect(() => Brightness.setSystemMode('unknown' as never)).toThrow(
      'Brightness.setSystemMode: mode must be one of: manual, automatic.'
    )
  })

  it('never fires listeners', () => {
    Brightness.addListener(() => {
      throw new Error('must not fire')
    }).remove()
  })

  it('throws synchronously for a non-function listener', () => {
    expect(() => Brightness.addListener('nope' as never)).toThrow(
      'Brightness.addListener: listener must be a function'
    )
  })

  it('exposes the namespace object', () => {
    expect(Object.keys(Brightness).sort()).toEqual([
      'addListener',
      'get',
      'getPermissions',
      'getSystem',
      'getSystemMode',
      'isAvailable',
      'isUsingSystem',
      'requestPermissions',
      'restoreSystem',
      'set',
      'setSystem',
      'setSystemMode',
    ])
    expect(Object.isFrozen(Brightness)).toBe(true)
  })
})

describe('brightness native entry', () => {
  function stubHybrid(overrides: Record<string, unknown> = {}) {
    return {
      get: async () => 0.5,
      set: async () => {},
      getSystem: async () => 0.7,
      setSystem: async () => {},
      getSystemMode: async () => 'manual',
      setSystemMode: async () => {},
      isUsingSystem: async () => false,
      restoreSystem: async () => {},
      getPermissions: async () => ({
        status: 'granted',
        granted: true,
        canAskAgain: false,
      }),
      requestPermissions: async () => ({
        status: 'granted',
        granted: true,
        canAskAgain: false,
      }),
      isAvailable: () => true,
      addListener: () => () => {},
      ...overrides,
    }
  }

  it('reads and writes through the hybrid object', async () => {
    const { Brightness: NativeBrightness } = await loadNativeEntry(stubHybrid())
    expect(await NativeBrightness.get()).toBe(0.5)
    await NativeBrightness.set(0.25)
    expect(await NativeBrightness.getSystem()).toBe(0.7)
    await NativeBrightness.setSystem(0.8)
    expect(await NativeBrightness.getSystemMode()).toBe('manual')
    await NativeBrightness.setSystemMode('automatic')
    expect(await NativeBrightness.isUsingSystem()).toBe(false)
    await NativeBrightness.restoreSystem()
    expect(await NativeBrightness.getPermissions()).toEqual({
      status: 'granted',
      granted: true,
      canAskAgain: false,
    })
    expect(NativeBrightness.isAvailable()).toBe(true)
  })

  it('restores the stable code from a coded rejection', async () => {
    const { Brightness: NativeBrightness } = await loadNativeEntry(
      stubHybrid({
        setSystem: async () => {
          throw new Error(
            'E_BRIGHTNESS_PERMISSIONS: Brightness.setSystem: system brightness needs the write-settings permission\n'
          )
        },
      })
    )
    const failure = await NativeBrightness.setSystem(1).catch((error: unknown) => error)
    expect((failure as Error).message).toBe(
      'Brightness.setSystem: system brightness needs the write-settings permission'
    )
    expect((failure as { code?: string }).code).toBe('E_BRIGHTNESS_PERMISSIONS')
  })

  it('throws synchronously for out-of-range values and bad modes', async () => {
    const { Brightness: NativeBrightness } = await loadNativeEntry(stubHybrid())
    expect(() => NativeBrightness.set(Number.NaN)).toThrow(
      'Brightness.set: value must be a number between 0 and 1'
    )
    expect(() => NativeBrightness.setSystem(1.5)).toThrow(
      'Brightness.setSystem: value must be a number between 0 and 1'
    )
    expect(() => NativeBrightness.setSystemMode('unknown' as never)).toThrow(
      'Brightness.setSystemMode: mode must be one of: manual, automatic.'
    )
  })

  it('wraps the remover in a subscription', async () => {
    const remove = vi.fn()
    const { Brightness: NativeBrightness } = await loadNativeEntry(
      stubHybrid({ addListener: () => remove })
    )
    const subscription = NativeBrightness.addListener(() => {})
    subscription.remove()
    expect(remove).toHaveBeenCalledTimes(1)
  })
})
