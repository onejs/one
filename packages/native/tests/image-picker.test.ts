import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createRequestGuard,
  resolveCameraOptions,
  resolveImagePickerOptions,
} from '../src/image-picker/options'

const getMock = vi.fn()

vi.mock('react-native', () => ({
  TurboModuleRegistry: { get: (...args: unknown[]) => getMock(...args) },
}))

async function loadImagePicker() {
  const module = await import('../src/image-picker/index.native')
  return module.ImagePicker
}

describe('resolveImagePickerOptions', () => {
  it('defaults to a single image pick', () => {
    expect(resolveImagePickerOptions()).toEqual({
      mediaTypes: ['images'],
      selectionLimit: 1,
    })
    expect(resolveImagePickerOptions({})).toEqual({
      mediaTypes: ['images'],
      selectionLimit: 1,
    })
  })

  it('normalizes one media type to a list and dedupes pairs', () => {
    expect(resolveImagePickerOptions({ mediaTypes: 'videos' })).toEqual({
      mediaTypes: ['videos'],
      selectionLimit: 1,
    })
    expect(
      resolveImagePickerOptions({ mediaTypes: ['videos', 'images', 'videos'] })
    ).toEqual({ mediaTypes: ['videos', 'images'], selectionLimit: 1 })
  })

  it('passes selection limits through, with 0 meaning unlimited', () => {
    expect(resolveImagePickerOptions({ selectionLimit: 0 })).toEqual({
      mediaTypes: ['images'],
      selectionLimit: 0,
    })
    expect(resolveImagePickerOptions({ selectionLimit: 5 })).toEqual({
      mediaTypes: ['images'],
      selectionLimit: 5,
    })
  })

  it('rejects unknown media types and empty lists', () => {
    expect(() => resolveImagePickerOptions({ mediaTypes: 'gifs' as never })).toThrow(
      /mediaTypes/
    )
    expect(() =>
      resolveImagePickerOptions({ mediaTypes: ['images', 'gifs'] as never })
    ).toThrow(/mediaTypes/)
    expect(() => resolveImagePickerOptions({ mediaTypes: [] })).toThrow(/mediaTypes/)
  })

  it('rejects negative and fractional selection limits', () => {
    expect(() => resolveImagePickerOptions({ selectionLimit: -1 })).toThrow(
      /selectionLimit/
    )
    expect(() => resolveImagePickerOptions({ selectionLimit: 1.5 })).toThrow(
      /selectionLimit/
    )
    expect(() => resolveImagePickerOptions({ selectionLimit: Number.NaN })).toThrow(
      /selectionLimit/
    )
  })
})

describe('resolveCameraOptions', () => {
  it('accepts images and validates the shared shape', () => {
    expect(resolveCameraOptions()).toEqual({
      mediaTypes: ['images'],
      selectionLimit: 1,
    })
    expect(() => resolveCameraOptions({ mediaTypes: 'gifs' as never })).toThrow(
      /mediaTypes/
    )
  })

  it('rejects video capture', () => {
    expect(() => resolveCameraOptions({ mediaTypes: 'videos' })).toThrow(
      /launchCamera.*video/
    )
    expect(() =>
      resolveCameraOptions({ mediaTypes: ['images', 'videos'] })
    ).toThrow(/launchCamera.*video/)
  })
})

describe('createRequestGuard', () => {
  it('runs sequential calls and resets after a rejection', async () => {
    const guarded = createRequestGuard()
    expect(await guarded('launchLibrary', async () => 'first')).toBe('first')
    await expect(
      guarded('launchLibrary', async () => {
        throw new Error('boom')
      })
    ).rejects.toThrow('boom')
    expect(await guarded('launchLibrary', async () => 'third')).toBe('third')
  })

  it('throws synchronously on an overlapping call', async () => {
    const guarded = createRequestGuard()
    let release!: () => void
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    const first = guarded('launchLibrary', () => gate.then(() => 'done'))
    await expect(guarded('launchCamera', async () => 'late')).rejects.toThrow(
      /launchCamera.*already in flight/
    )
    release()
    expect(await first).toBe('done')
  })
})

describe('ImagePicker without its native module', () => {
  beforeEach(() => {
    getMock.mockReset()
    getMock.mockReturnValue(null)
    vi.resetModules()
  })

  it('rejects every call with the verb in the message', async () => {
    const ImagePicker = await loadImagePicker()
    await expect(ImagePicker.launchLibrary()).rejects.toThrow(
      'ImagePicker.launchLibrary needs a native build that includes @vxrn/native'
    )
    await expect(ImagePicker.launchCamera()).rejects.toThrow(
      'ImagePicker.launchCamera needs a native build that includes @vxrn/native'
    )
    await expect(ImagePicker.getCameraPermissions()).rejects.toThrow(
      'ImagePicker.getCameraPermissions needs a native build that includes @vxrn/native'
    )
    await expect(ImagePicker.requestCameraPermissions()).rejects.toThrow(
      'ImagePicker.requestCameraPermissions needs a native build that includes @vxrn/native'
    )
  })

  it('passes options and results through the module untouched', async () => {
    const launchLibrary = vi.fn(async () => ({ canceled: true, assets: null }))
    getMock.mockReturnValue({ launchLibrary })
    const ImagePicker = await loadImagePicker()
    const result = await ImagePicker.launchLibrary({
      mediaTypes: ['images', 'videos'],
      selectionLimit: 3,
    })
    expect(result).toEqual({ canceled: true, assets: null })
    expect(launchLibrary).toHaveBeenCalledWith({
      mediaTypes: ['images', 'videos'],
      selectionLimit: 3,
    })
  })
})
