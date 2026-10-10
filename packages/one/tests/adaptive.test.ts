import { createElement } from 'react'
import { act, create } from 'react-test-renderer'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { HingeState, SizeClass } from '../src/platform/adaptive/types'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

const { getMock } = vi.hoisted(() => ({ getMock: vi.fn() }))

vi.mock('react-native-nitro-modules', () => ({
  NitroModules: { createHybridObject: getMock },
}))

// ReservedRegions.native pulls a codegen spec (Flow) this project cannot
// parse; the seed tests never touch it.
vi.mock('../src/platform/adaptive/ReservedRegions.native', () => ({}))

async function loadNative() {
  // the native entry creates the hybrid and seeds from it at module scope,
  // so each case re-imports fresh after setting the mock.
  vi.resetModules()
  return await import('../src/platform/adaptive/index.native')
}

const seedSizeClass = { horizontal: 'compact', vertical: 'regular' } as const

function mockHybrid() {
  return {
    getInitialSizeClass: vi.fn(() => ({ ...seedSizeClass })),
    getInitialHinge: vi.fn(() => undefined),
    getSizeClass: vi.fn(async () => ({ ...seedSizeClass })),
    getHinge: vi.fn(async () => undefined),
    addSizeClassListener: vi.fn(() => () => {}),
    addHingeListener: vi.fn(() => () => {}),
  }
}

beforeEach(() => {
  getMock.mockReset()
})

describe('adaptive import-time seed', () => {
  it('reads the initial size class and hinge synchronously at import', async () => {
    const hybrid = mockHybrid()
    getMock.mockReturnValue(hybrid)
    await loadNative()
    expect(getMock).toHaveBeenCalledWith('OneAdaptive')
    expect(hybrid.getInitialSizeClass).toHaveBeenCalledTimes(1)
    expect(hybrid.getInitialHinge).toHaveBeenCalledTimes(1)
  })

  it('throws at import when the hybrid is missing instead of falling back', async () => {
    getMock.mockImplementation(() => {
      throw new Error('missing OneAdaptive')
    })
    await expect(loadNative()).rejects.toThrow('missing OneAdaptive')
  })

  it('delegates one-shot reads to the hybrid with no fallback', async () => {
    const hybrid = mockHybrid()
    getMock.mockReturnValue(hybrid)
    const { getSizeClass, getHinge } = await loadNative()
    await expect(getSizeClass()).resolves.toEqual(seedSizeClass)
    await expect(getHinge()).resolves.toBeNull()
    expect(hybrid.getSizeClass).toHaveBeenCalledTimes(1)
    expect(hybrid.getHinge).toHaveBeenCalledTimes(1)
  })
})

describe('live size-class subscription', () => {
  it('keeps a native event ahead of an older initial read', async () => {
    let resolveRead!: (value: SizeClass) => void
    const read = new Promise<SizeClass>((resolve) => {
      resolveRead = resolve
    })
    let nativeListener: ((value: SizeClass) => void) | undefined
    const remove = vi.fn(() => {
      nativeListener = undefined
    })
    const hybrid = {
      ...mockHybrid(),
      getSizeClass: vi.fn(() => read),
      addSizeClassListener: vi.fn((listener: (value: SizeClass) => void) => {
        nativeListener = listener
        return remove
      }),
    }
    getMock.mockReturnValue(hybrid)
    const { useSizeClass } = await loadNative()
    const values: SizeClass[] = []
    function Reader() {
      values.push(useSizeClass())
      return null
    }
    let root!: ReturnType<typeof create>
    await act(async () => {
      root = create(createElement(Reader))
    })
    const live: SizeClass = { horizontal: 'regular', vertical: 'compact' }
    await act(async () => {
      nativeListener?.(live)
    })
    resolveRead({ ...seedSizeClass })
    await act(async () => {
      await read
    })
    expect(values.at(-1)).toEqual(live)
    act(() => {
      root.unmount()
    })
    expect(remove).toHaveBeenCalledTimes(1)
  })

  it('reseeds a remount and ignores the previous subscription read', async () => {
    let resolveRead!: (value: SizeClass) => void
    const read = new Promise<SizeClass>((resolve) => {
      resolveRead = resolve
    })
    const next: SizeClass = { horizontal: 'regular', vertical: 'compact' }
    const remove = vi.fn()
    const hybrid = {
      ...mockHybrid(),
      getInitialSizeClass: vi
        .fn()
        .mockReturnValueOnce(seedSizeClass)
        .mockReturnValueOnce(next),
      getSizeClass: vi
        .fn()
        .mockReturnValueOnce(read)
        .mockReturnValueOnce(new Promise(() => {})),
      addSizeClassListener: vi.fn(() => remove),
    }
    getMock.mockReturnValue(hybrid)
    const { useSizeClass } = await loadNative()
    const values: SizeClass[] = []
    function Reader() {
      values.push(useSizeClass())
      return null
    }
    let root!: ReturnType<typeof create>
    await act(async () => {
      root = create(createElement(Reader))
    })
    act(() => {
      root.unmount()
    })
    const before = values.length
    await act(async () => {
      root = create(createElement(Reader))
    })
    expect(values[before]).toEqual(next)
    resolveRead({ ...seedSizeClass })
    await act(async () => {
      await read
    })
    expect(values.slice(before).every((value) => value === next)).toBe(true)
    act(() => {
      root.unmount()
    })
    expect(hybrid.getInitialSizeClass).toHaveBeenCalledTimes(2)
    expect(hybrid.addSizeClassListener).toHaveBeenCalledTimes(2)
    expect(remove).toHaveBeenCalledTimes(2)
  })
})

describe('live hinge subscription', () => {
  it('keeps the native event ahead of a stale read and clears the last observer', async () => {
    let resolveRead!: (value: HingeState) => void
    const read = new Promise<HingeState>((resolve) => {
      resolveRead = resolve
    })
    let nativeListener: ((value: HingeState | undefined) => void) | undefined
    const hybrid = {
      ...mockHybrid(),
      getHinge: vi
        .fn()
        .mockReturnValueOnce(read)
        .mockReturnValueOnce(new Promise(() => {})),
      addHingeListener: vi.fn((listener: (value: HingeState | undefined) => void) => {
        nativeListener = listener
        return () => {
          nativeListener = undefined
        }
      }),
    }
    getMock.mockReturnValue(hybrid)
    const { useHinge } = await loadNative()
    const values: (HingeState | null)[] = []
    function Reader() {
      values.push(useHinge())
      return null
    }
    let root!: ReturnType<typeof create>
    await act(async () => {
      root = create(createElement(Reader))
    })
    const live: HingeState = { status: 'partiallyOpen', angle: 1.1 }
    await act(async () => {
      nativeListener?.(live)
    })
    resolveRead({ status: 'closed', angle: 0 })
    await act(async () => {
      await read
    })
    expect(values.at(-1)).toEqual(live)
    act(() => {
      root.unmount()
    })
    await act(async () => {
      root = create(createElement(Reader))
    })
    expect(values.at(-1)).toBeNull()
    act(() => {
      root.unmount()
    })
    expect(hybrid.addHingeListener).toHaveBeenCalledTimes(2)
  })

  it('renders the native hinge on the first frame, including after the last observer left', async () => {
    const closed: HingeState = { status: 'closed', angle: 0 }
    const open: HingeState = { status: 'fullyOpen', angle: Math.PI }
    const hybrid = {
      ...mockHybrid(),
      getInitialHinge: vi.fn().mockReturnValueOnce(closed).mockReturnValueOnce(open),
      getHinge: vi.fn(() => new Promise<undefined>(() => {})),
    }
    getMock.mockReturnValue(hybrid)
    const { useHinge } = await loadNative()
    const values: (HingeState | null)[] = []
    function Reader() {
      values.push(useHinge())
      return null
    }
    let root!: ReturnType<typeof create>
    await act(async () => {
      root = create(createElement(Reader))
    })
    expect(values[0]).toEqual(closed)
    act(() => {
      root.unmount()
    })
    // the device unfolded while nothing observed it; the remount's first
    // render reads the native seed again instead of the stale cache or null.
    const before = values.length
    await act(async () => {
      root = create(createElement(Reader))
    })
    expect(values[before]).toEqual(open)
    expect(values.slice(before).every((value) => value === open)).toBe(true)
    act(() => {
      root.unmount()
    })
    expect(hybrid.getInitialHinge).toHaveBeenCalledTimes(2)
  })
})
