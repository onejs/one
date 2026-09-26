import { createElement } from 'react'
import { act, create } from 'react-test-renderer'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { HingeState } from '../src/platform/adaptive/types'

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

describe('live hinge subscription', () => {
  it('keeps the native event ahead of a stale read and clears the last observer', async () => {
    let resolveRead!: (value: HingeState) => void
    const read = new Promise<HingeState>((resolve) => { resolveRead = resolve })
    let nativeListener: ((value: HingeState | undefined) => void) | undefined
    const hybrid = {
      ...mockHybrid(),
      getHinge: vi.fn().mockReturnValueOnce(read).mockReturnValueOnce(new Promise(() => {})),
      addHingeListener: vi.fn((listener: (value: HingeState | undefined) => void) => {
        nativeListener = listener
        return () => { nativeListener = undefined }
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
    await act(async () => { root = create(createElement(Reader)) })
    const live: HingeState = { status: 'partiallyOpen', angle: 1.1 }
    await act(async () => { nativeListener?.(live) })
    resolveRead({ status: 'closed', angle: 0 })
    await act(async () => { await read })
    expect(values.at(-1)).toEqual(live)
    act(() => { root.unmount() })
    await act(async () => { root = create(createElement(Reader)) })
    expect(values.at(-1)).toBeNull()
    act(() => { root.unmount() })
    expect(hybrid.addHingeListener).toHaveBeenCalledTimes(2)
  })
})
