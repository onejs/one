import { describe, expect, it, vi } from 'vitest'
import { Location as WebLocation } from '../src/platform/location/index'
import { Location as UnavailableLocation } from '../src/platform/location/unavailable'
import {
  assertIdentifier,
  assertRegion,
  assertRegionListener,
} from '../src/platform/location/validation'

vi.mock('react-native-nitro-modules', () => ({
  NitroModules: { createHybridObject: vi.fn() },
}))

async function loadNativeEntry(hybrid: unknown) {
  vi.resetModules()
  const { NitroModules } = await import('react-native-nitro-modules')
  vi.mocked(NitroModules.createHybridObject).mockReturnValue(hybrid as never)
  return import('../src/platform/location/index.native')
}

const region = {
  identifier: 'office',
  center: { latitude: 37.7749, longitude: -122.4194 },
  radius: 100,
}

describe('region monitoring validation', () => {
  it('requires a non-empty identifier', () => {
    expect(() => assertRegion({ ...region, identifier: '' }, 'startMonitoring')).toThrow(
      'Location.startMonitoring: region identifier must be a non-empty string'
    )
    expect(() => assertRegion({ ...region, identifier: undefined }, 'startMonitoring')).toThrow(
      'Location.startMonitoring: region identifier must be a non-empty string'
    )
  })

  it('requires a center coordinate in range', () => {
    expect(() =>
      assertRegion({ ...region, center: { latitude: 91, longitude: 0 } }, 'startMonitoring')
    ).toThrow('Location.startMonitoring: region center latitude must be a number from -90 to 90')
    expect(() =>
      assertRegion({ ...region, center: { latitude: 0, longitude: 181 } }, 'startMonitoring')
    ).toThrow(
      'Location.startMonitoring: region center longitude must be a number from -180 to 180'
    )
    expect(() => assertRegion({ ...region, center: null }, 'startMonitoring')).toThrow(
      'Location.startMonitoring: region center must be an object'
    )
  })

  it('requires a positive radius and boolean flags', () => {
    expect(() => assertRegion({ ...region, radius: -1 }, 'startMonitoring')).toThrow(
      'Location.startMonitoring: region radius must be a number greater than 0'
    )
    expect(() =>
      assertRegion({ ...region, notifyOnEntry: 'yes' }, 'startMonitoring')
    ).toThrow('Location.startMonitoring: region notifyOnEntry must be a boolean')
    expect(() => assertRegion({ ...region, notifyOnExit: 1 }, 'startMonitoring')).toThrow(
      'Location.startMonitoring: region notifyOnExit must be a boolean'
    )
  })

  it('validates identifiers and listeners with the verb in the message', () => {
    expect(() => assertIdentifier('', 'stopMonitoring')).toThrow(
      'Location.stopMonitoring: region identifier must be a non-empty string'
    )
    expect(() => assertIdentifier(7, 'requestState')).toThrow(
      'Location.requestState: region identifier must be a non-empty string'
    )
    expect(() => assertRegionListener(null, 'addDidEnterRegionListener')).toThrow(
      'Location.addDidEnterRegionListener: listener must be a function'
    )
    expect(() => assertRegionListener(null, 'addDidExitRegionListener')).toThrow(
      'Location.addDidExitRegionListener: listener must be a function'
    )
  })
})

describe('region monitoring web and unavailable entries', () => {
  for (const [name, entry] of [
    ['web', WebLocation],
    ['unavailable', UnavailableLocation],
  ] as const) {
    it(`${name} throws the same message for an invalid region`, () => {
      expect(() => entry.startMonitoring({ ...region, radius: -1 })).toThrow(
        'Location.startMonitoring: region radius must be a number greater than 0'
      )
      expect(() => entry.stopMonitoring('')).toThrow(
        'Location.stopMonitoring: region identifier must be a non-empty string'
      )
      expect(() => entry.requestState('')).toThrow(
        'Location.requestState: region identifier must be a non-empty string'
      )
      expect(() => entry.addDidEnterRegionListener(null as never)).toThrow(
        'Location.addDidEnterRegionListener: listener must be a function'
      )
      expect(() => entry.addDidExitRegionListener(null as never)).toThrow(
        'Location.addDidExitRegionListener: listener must be a function'
      )
    })

    it(`${name} resolves the empty monitoring contract`, async () => {
      await expect(entry.startMonitoring(region)).resolves.toBeUndefined()
      await expect(entry.stopMonitoring('office')).resolves.toBeUndefined()
      expect(entry.monitoredRegions()).toEqual([])
      await expect(entry.requestState('office')).resolves.toBe('unknown')
      await expect(entry.requestAlwaysAuthorization()).resolves.toBe('denied')
      const entered = entry.addDidEnterRegionListener(() => {})
      const exited = entry.addDidExitRegionListener(() => {})
      expect(entered.remove).toBeTypeOf('function')
      expect(exited.remove).toBeTypeOf('function')
      entered.remove()
      exited.remove()
    })
  }
})

describe('region monitoring native entry', () => {
  it('forwards calls to the hybrid object and wraps listener removers', async () => {
    const removeEnter = vi.fn()
    const removeExit = vi.fn()
    const hybrid = {
      startMonitoring: vi.fn(async () => undefined),
      stopMonitoring: vi.fn(async () => undefined),
      monitoredRegions: vi.fn(() => [region]),
      requestState: vi.fn(async () => 'inside'),
      addDidEnterRegionListener: vi.fn(() => removeEnter),
      addDidExitRegionListener: vi.fn(() => removeExit),
    }
    const { Location } = await loadNativeEntry(hybrid)
    await Location.startMonitoring(region)
    expect(hybrid.startMonitoring).toHaveBeenCalledWith(region)
    await Location.stopMonitoring('office')
    expect(hybrid.stopMonitoring).toHaveBeenCalledWith('office')
    expect(Location.monitoredRegions()).toEqual([region])
    await expect(Location.requestState('office')).resolves.toBe('inside')
    const entered = Location.addDidEnterRegionListener(() => {})
    const exited = Location.addDidExitRegionListener(() => {})
    entered.remove()
    exited.remove()
    expect(removeEnter).toHaveBeenCalledTimes(1)
    expect(removeExit).toHaveBeenCalledTimes(1)
  })

  it('throws invalid regions before reaching native', async () => {
    const hybrid = {
      startMonitoring: vi.fn(async () => undefined),
      stopMonitoring: vi.fn(async () => undefined),
      monitoredRegions: vi.fn(() => []),
      requestState: vi.fn(async () => 'unknown'),
      addDidEnterRegionListener: vi.fn(() => () => {}),
      addDidExitRegionListener: vi.fn(() => () => {}),
    }
    const { Location } = await loadNativeEntry(hybrid)
    expect(() => Location.startMonitoring({ ...region, radius: 0 })).toThrow(
      'Location.startMonitoring: region radius must be a number greater than 0'
    )
    expect(hybrid.startMonitoring).not.toHaveBeenCalled()
  })

  it('restores the stable code from native rejections', async () => {
    const hybrid = {
      startMonitoring: vi.fn(async () => {
        throw new Error(
          'OneLocation.startMonitoring(...): E_LOCATION_PERMISSION: Location.startMonitoring: location permission is required'
        )
      }),
      stopMonitoring: vi.fn(async () => undefined),
      monitoredRegions: vi.fn(() => []),
      requestState: vi.fn(async () => 'unknown'),
      addDidEnterRegionListener: vi.fn(() => () => {}),
      addDidExitRegionListener: vi.fn(() => () => {}),
    }
    const { Location } = await loadNativeEntry(hybrid)
    const failure = await Location.startMonitoring(region).catch((error: Error) => error)
    expect(failure).toBeInstanceOf(Error)
    expect((failure as Error & { code: string }).code).toBe('E_LOCATION_PERMISSION')
  })
})
