import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ImagePicker as WebImagePicker } from '../src/image-picker/index'
import {
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

describe('ImagePicker without its native module', () => {
  beforeEach(() => {
    getMock.mockReset()
    getMock.mockReturnValue(null)
    vi.resetModules()
  })

  it('throws synchronously from the launches, rejects from the permission reads', async () => {
    const ImagePicker = await loadImagePicker()
    expect(() => ImagePicker.launchLibrary()).toThrow(
      'ImagePicker.launchLibrary needs a native build that includes @vxrn/native'
    )
    expect(() => ImagePicker.launchCamera()).toThrow(
      'ImagePicker.launchCamera needs a native build that includes @vxrn/native'
    )
    await expect(ImagePicker.getCameraPermissions()).rejects.toThrow(
      'ImagePicker.getCameraPermissions needs a native build that includes @vxrn/native'
    )
    await expect(ImagePicker.requestCameraPermissions()).rejects.toThrow(
      'ImagePicker.requestCameraPermissions needs a native build that includes @vxrn/native'
    )
  })

  it('validates arguments synchronously through the namespace', async () => {
    const ImagePicker = await loadImagePicker()
    expect(() =>
      ImagePicker.launchLibrary({ mediaTypes: 'gifs' as never })
    ).toThrow(/mediaTypes/)
    expect(() => ImagePicker.launchLibrary({ selectionLimit: -1 })).toThrow(
      /selectionLimit/
    )
    expect(() => ImagePicker.launchCamera({ mediaTypes: 'videos' })).toThrow(
      /launchCamera.*video/
    )
  })

  it('validates before reaching the native module', async () => {
    getMock.mockReturnValue({ launchLibrary: vi.fn(), launchCamera: vi.fn() })
    const ImagePicker = await loadImagePicker()
    expect(() => ImagePicker.launchLibrary({ mediaTypes: [] })).toThrow(/mediaTypes/)
    expect(() =>
      ImagePicker.launchCamera({ mediaTypes: ['images', 'videos'] })
    ).toThrow(/launchCamera.*video/)
    expect(getMock).not.toHaveBeenCalled()
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

describe('ImagePicker on web', () => {
  it('validates arguments synchronously through the namespace', () => {
    expect(() =>
      WebImagePicker.launchLibrary({ mediaTypes: 'gifs' as never })
    ).toThrow(/mediaTypes/)
    expect(() => WebImagePicker.launchLibrary({ selectionLimit: 1.5 })).toThrow(
      /selectionLimit/
    )
    expect(() => WebImagePicker.launchCamera({ mediaTypes: 'videos' })).toThrow(
      /launchCamera.*video/
    )
  })

  it('reads granted from both permission calls', async () => {
    await expect(WebImagePicker.getCameraPermissions()).resolves.toEqual({
      status: 'granted',
      granted: true,
      canAskAgain: true,
    })
    await expect(WebImagePicker.requestCameraPermissions()).resolves.toEqual({
      status: 'granted',
      granted: true,
      canAskAgain: true,
    })
  })

  it('rejects launches on the server as no native side', async () => {
    await expect(WebImagePicker.launchLibrary()).rejects.toThrow(
      'ImagePicker.launchLibrary needs an iOS or Android build'
    )
    await expect(WebImagePicker.launchCamera()).rejects.toThrow(
      'ImagePicker.launchCamera needs an iOS or Android build'
    )
  })
})
