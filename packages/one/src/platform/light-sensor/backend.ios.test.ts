import { describe, expect, it, vi } from 'vitest'
import { NitroModules } from 'react-native-nitro-modules'
import { lightSensorNative } from './backend.ios'

vi.mock('react-native-nitro-modules', () => ({
  NitroModules: {
    createHybridObject: vi.fn(() => {
      throw new Error('must not reach Nitro on iOS')
    }),
  },
}))

// the ios entry resolves ./backend to backend.ios through metro; mirror that
// selection here so the public entry runs the js backend under test.
vi.mock('./backend', async () => await import('./backend.ios'))

const createHybridObject = vi.mocked(NitroModules.createHybridObject)

describe('light sensor ios backend', () => {
  it('reads unavailable with no-op pacing and removal', () => {
    const backend = lightSensorNative()
    expect(backend.isAvailable()).toBe(false)
    backend.setUpdateInterval(100)
    const remove = backend.addListener(() => {
      throw new Error('must not fire')
    })
    remove()
    remove()
  })
})

describe('light sensor ios entry', () => {
  it('never reaches Nitro on iOS', async () => {
    vi.resetModules()
    const { LightSensor: NativeLightSensor } = await import('./index.native')
    expect(NativeLightSensor.isAvailable()).toBe(false)
    NativeLightSensor.setUpdateInterval(100)
    const seen: unknown[] = []
    const subscription = NativeLightSensor.addListener((event) => {
      seen.push(event)
    })
    subscription.remove()
    subscription.remove()
    expect(seen).toEqual([])
    expect(createHybridObject).not.toHaveBeenCalled()
  })

  it('validates arguments before touching native', async () => {
    vi.resetModules()
    const { LightSensor: NativeLightSensor } = await import('./index.native')
    expect(() => NativeLightSensor.addListener('nope' as never)).toThrow(
      'LightSensor.addListener: listener must be a function'
    )
    expect(() => NativeLightSensor.setUpdateInterval(-1)).toThrow(
      'LightSensor.setUpdateInterval: interval must be a finite number at least 0'
    )
    expect(createHybridObject).not.toHaveBeenCalled()
  })

  it('exposes the frozen namespace', async () => {
    vi.resetModules()
    const { LightSensor: NativeLightSensor } = await import('./index.native')
    expect(Object.keys(NativeLightSensor).sort()).toEqual([
      'addListener',
      'isAvailable',
      'setUpdateInterval',
    ])
    expect(Object.isFrozen(NativeLightSensor)).toBe(true)
  })
})
