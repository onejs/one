import { describe, expect, it, vi } from 'vitest'
import { Pedometer } from '../src/platform/pedometer/index'

vi.mock('react-native-nitro-modules', () => ({
  NitroModules: { createHybridObject: vi.fn() },
}))

async function loadNativeEntry(hybrid: unknown) {
  vi.resetModules()
  const { NitroModules } = await import('react-native-nitro-modules')
  vi.mocked(NitroModules.createHybridObject).mockReturnValue(hybrid as never)
  return import('../src/platform/pedometer/index.native')
}

const denied = { status: 'denied', granted: false, canAskAgain: false }

describe('pedometer web', () => {
  it('reads unavailable, rejects history, denies permissions', async () => {
    expect(Pedometer.isAvailable()).toBe(false)
    Pedometer.watchStepCount(() => {
      throw new Error('must not fire')
    }).remove()
    const failure = await Pedometer.getStepCount(new Date(0), new Date(1000)).catch(
      (error: unknown) => error
    )
    expect(failure).toBeInstanceOf(Error)
    expect((failure as Error).message).toBe(
      'Pedometer.getStepCount needs an iOS or Android build'
    )
    expect(await Pedometer.getPermissions()).toEqual(denied)
    expect(await Pedometer.requestPermissions()).toEqual(denied)
  })

  it('throws synchronously for invalid arguments', () => {
    expect(() => Pedometer.watchStepCount('nope' as never)).toThrow(
      'Pedometer.watchStepCount: listener must be a function'
    )
    expect(() => Pedometer.getStepCount('then' as never, new Date())).toThrow(
      'Pedometer.getStepCount: start and end must be Dates'
    )
    expect(() =>
      Pedometer.getStepCount(new Date(Number.NaN), new Date())
    ).toThrow('Pedometer.getStepCount: start and end must be valid dates')
    expect(() =>
      Pedometer.getStepCount(new Date(2000), new Date(1000))
    ).toThrow('Pedometer.getStepCount: start must precede end')
  })

  it('exposes the namespace object', () => {
    expect(Object.keys(Pedometer).sort()).toEqual([
      'getPermissions',
      'getStepCount',
      'isAvailable',
      'requestPermissions',
      'watchStepCount',
    ])
    expect(Object.isFrozen(Pedometer)).toBe(true)
  })
})

describe('pedometer native entry', () => {
  function stubHybrid(overrides: Record<string, unknown> = {}) {
    return {
      isAvailable: () => true,
      watchStepCount: () => () => {},
      getStepCount: async () => ({ steps: 42 }),
      getPermissions: async () => ({ status: 'granted', granted: true, canAskAgain: false }),
      requestPermissions: async () => ({
        status: 'granted',
        granted: true,
        canAskAgain: false,
      }),
      ...overrides,
    }
  }

  it('reads through the hybrid object', async () => {
    const getStepCount = vi.fn(async () => ({ steps: 42 }))
    const { Pedometer: NativePedometer } = await loadNativeEntry(
      stubHybrid({ getStepCount })
    )
    expect(NativePedometer.isAvailable()).toBe(true)
    expect(await NativePedometer.getStepCount(new Date(0), new Date(1000))).toEqual({
      steps: 42,
    })
    expect(getStepCount).toHaveBeenCalledWith(0, 1000)
    expect(await NativePedometer.getPermissions()).toEqual({
      status: 'granted',
      granted: true,
      canAskAgain: false,
    })
  })

  it('streams expo-shaped steps and wraps the remover', async () => {
    const seen: { steps: number }[] = []
    const remove = vi.fn()
    const { Pedometer: NativePedometer } = await loadNativeEntry(
      stubHybrid({
        watchStepCount: (listener: (result: never) => void) => {
          listener({ steps: 3 } as never)
          return remove
        },
      })
    )
    const subscription = NativePedometer.watchStepCount((result) => {
      seen.push(result)
    })
    expect(seen).toEqual([{ steps: 3 }])
    subscription.remove()
    expect(remove).toHaveBeenCalledTimes(1)
  })

  it('restores the stable code from a coded rejection', async () => {
    const { Pedometer: NativePedometer } = await loadNativeEntry(
      stubHybrid({
        getStepCount: async () => {
          throw new Error('E_PEDOMETER_STEP_COUNT: Pedometer.getStepCount: boom\n')
        },
      })
    )
    const failure = await NativePedometer.getStepCount(new Date(0), new Date(1000)).catch(
      (error: unknown) => error
    )
    expect(failure).toBeInstanceOf(Error)
    expect((failure as Error).message).toBe('Pedometer.getStepCount: boom')
    expect((failure as { code?: string }).code).toBe('E_PEDOMETER_STEP_COUNT')
  })

  it('validates arguments before touching native', async () => {
    const createHybridObject = vi.fn(() => {
      throw new Error('must not reach native')
    })
    vi.resetModules()
    const { NitroModules } = await import('react-native-nitro-modules')
    vi.mocked(NitroModules.createHybridObject).mockImplementation(
      createHybridObject as never
    )
    const { Pedometer: NativePedometer } =
      await import('../src/platform/pedometer/index.native')
    expect(() => NativePedometer.watchStepCount('nope' as never)).toThrow(
      'Pedometer.watchStepCount: listener must be a function'
    )
    expect(() =>
      NativePedometer.getStepCount(new Date(2000), new Date(1000))
    ).toThrow('Pedometer.getStepCount: start must precede end')
    expect(createHybridObject).not.toHaveBeenCalled()
  })
})
