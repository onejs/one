import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockGet, mockResolveAssetSource, mockLoad, mockIsLoaded } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockResolveAssetSource: vi.fn(),
  mockLoad: vi.fn(),
  mockIsLoaded: vi.fn(),
}))

vi.mock('react-native', () => ({
  Image: { resolveAssetSource: mockResolveAssetSource },
  TurboModuleRegistry: { get: mockGet },
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
