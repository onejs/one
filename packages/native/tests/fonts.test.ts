import { act, createElement } from 'react'
import TestRenderer from 'react-test-renderer'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { FontMap, UseFontsResult } from '../src/fonts/types'

const { mockGet, mockResolveAssetSource, mockLoad, mockIsLoaded } = vi.hoisted(() => ({
  // stands in for the OneFonts hybrid object lookup: null means not linked.
  mockGet: vi.fn(),
  mockResolveAssetSource: vi.fn(),
  mockLoad: vi.fn(),
  mockIsLoaded: vi.fn(),
}))

vi.mock('react-native', () => ({
  Image: { resolveAssetSource: mockResolveAssetSource },
}))

vi.mock('react-native-nitro-modules', () => ({
  NitroModules: {
    hasHybridObject: (name: string) => name === 'OneFonts' && mockGet() != null,
    createHybridObject: (name: string) => (name === 'OneFonts' ? mockGet() : null),
  },
}))

// the entry caches the module handle, so every case re-imports it fresh.
// reset first (this runs before the per-describe setup below).
beforeEach(() => {
  vi.resetModules()
  mockGet.mockReset()
  mockResolveAssetSource.mockReset()
  mockLoad.mockReset()
  mockIsLoaded.mockReset()
})

async function loadEntry() {
  return import('../src/fonts/index.native')
}

describe('Fonts.load', () => {
  beforeEach(() => {
    mockGet.mockReturnValue({ load: mockLoad, isLoaded: mockIsLoaded })
    mockLoad.mockResolvedValue(undefined)
  })

  it('passes string uris straight to one native load per entry', async () => {
    const { Fonts } = await loadEntry()
    await Fonts.load({ Body: 'file:///fonts/body.ttf', Head: 'https://x/head.otf' })

    expect(mockResolveAssetSource).not.toHaveBeenCalled()
    expect(mockLoad).toHaveBeenCalledTimes(2)
    expect(mockLoad).toHaveBeenCalledWith('Body', 'file:///fonts/body.ttf')
    expect(mockLoad).toHaveBeenCalledWith('Head', 'https://x/head.otf')
  })

  it('resolves numbers through Image.resolveAssetSource', async () => {
    mockResolveAssetSource.mockReturnValue({ uri: 'http://m:8081/a.ttf?platform=ios&hash=h' })
    const { Fonts } = await loadEntry()
    await Fonts.load({ Body: 42 })

    expect(mockResolveAssetSource).toHaveBeenCalledWith(42)
    expect(mockLoad).toHaveBeenCalledWith('Body', 'http://m:8081/a.ttf?platform=ios&hash=h')
  })

  it('rejects cleanly when an id is not a registered asset, with no native call', async () => {
    mockResolveAssetSource.mockReturnValue(null)
    const { Fonts } = await loadEntry()

    await expect(Fonts.load({ Body: 42 })).rejects.toThrow(
      'Fonts.load: "Body" is not a font asset'
    )
    expect(mockLoad).not.toHaveBeenCalled()
  })

  it('splits the code off a native rejection', async () => {
    mockLoad.mockRejectedValue(
      new Error('E_FONTS_URI: Fonts.load: "Body" points at a missing file\n')
    )
    const { Fonts } = await loadEntry()

    const error = await Fonts.load({ Body: 'file:///fonts/body.ttf' }).catch((e) => e)
    expect(error.message).toBe('Fonts.load: "Body" points at a missing file')
    expect(error.code).toBe('E_FONTS_URI')
  })

  it('rejects when the native module is missing', async () => {
    mockGet.mockReturnValue(null)
    const { Fonts } = await loadEntry()

    await expect(Fonts.load({ Body: 'file:///fonts/body.ttf' })).rejects.toThrow(
      'fonts need a native build that includes @vxrn/native'
    )
  })
})

describe('Fonts.isLoaded', () => {
  it('asks native and mirrors the answer', async () => {
    mockGet.mockReturnValue({ load: mockLoad, isLoaded: mockIsLoaded })
    mockIsLoaded.mockReturnValueOnce(true).mockReturnValueOnce(false)
    const { Fonts } = await loadEntry()

    expect(Fonts.isLoaded('Body')).toBe(true)
    expect(Fonts.isLoaded('Body')).toBe(false)
    expect(mockIsLoaded).toHaveBeenCalledWith('Body')
  })

  it('is false with no native module', async () => {
    mockGet.mockReturnValue(null)
    const { Fonts } = await loadEntry()

    expect(Fonts.isLoaded('Body')).toBe(false)
  })
})

describe('web Fonts.isLoaded', () => {
  async function loadWebEntry() {
    return import('../src/fonts/index')
  }

  function stubDocumentFonts(faces: { family: string; status: string }[]) {
    ;(globalThis as Record<string, unknown>).document = {
      fonts: { forEach: (cb: (face: unknown) => void) => faces.forEach(cb) },
    }
  }

  afterEach(() => {
    delete (globalThis as Record<string, unknown>).document
  })

  it('is false with no document', async () => {
    const { Fonts } = await loadWebEntry()

    expect(Fonts.isLoaded('Body')).toBe(false)
  })

  it('is true only for a face with the exact family and loaded status', async () => {
    stubDocumentFonts([
      { family: 'Body', status: 'loaded' },
      { family: 'Head', status: 'loading' },
    ])
    const { Fonts } = await loadWebEntry()

    expect(Fonts.isLoaded('Body')).toBe(true)
    expect(Fonts.isLoaded('Head')).toBe(false)
    expect(Fonts.isLoaded('Nope')).toBe(false)
  })
})

describe('useFonts', () => {
  function Probe({
    fonts,
    hook,
    seen,
  }: {
    fonts: FontMap
    hook: (fonts: FontMap) => UseFontsResult
    seen: UseFontsResult[]
  }) {
    const result = hook(fonts)
    seen.push(result)
    return null
  }

  it('seeds loaded from the platform without calling load', async () => {
    mockGet.mockReturnValue({ load: mockLoad, isLoaded: mockIsLoaded })
    mockIsLoaded.mockReturnValue(true)
    const { useFonts } = await loadEntry()
    const seen: UseFontsResult[] = []

    await act(async () => {
      TestRenderer.create(createElement(Probe, { fonts: { Body: 'file:///b.ttf' }, hook: useFonts, seen }))
    })

    expect(seen[0]).toEqual([true, null])
    expect(mockLoad).not.toHaveBeenCalled()
  })

  it('loads once across rerenders with a fresh literal', async () => {
    mockGet.mockReturnValue({ load: mockLoad, isLoaded: mockIsLoaded })
    mockIsLoaded.mockReturnValue(false)
    mockLoad.mockResolvedValue(undefined)
    const { useFonts } = await loadEntry()
    const seen: UseFontsResult[] = []
    let renderer: TestRenderer.ReactTestRenderer | undefined

    await act(async () => {
      renderer = TestRenderer.create(
        createElement(Probe, { fonts: { Body: 'file:///b.ttf' }, hook: useFonts, seen })
      )
    })
    await act(async () => {
      renderer!.update(
        createElement(Probe, { fonts: { Body: 'file:///b.ttf' }, hook: useFonts, seen })
      )
    })

    expect(mockLoad).toHaveBeenCalledTimes(1)
    expect(seen[seen.length - 1]).toEqual([true, null])
  })
})
