import { describe, expect, it, vi } from 'vitest'
import { ImagePicker as WebImagePicker } from '../src/platform/image-picker/index'
import {
  resolveCameraOptions,
  resolveImagePickerOptions,
} from '../src/platform/image-picker/options'

vi.mock('react-native-nitro-modules', () => ({
  NitroModules: { hasHybridObject: vi.fn(), createHybridObject: vi.fn() },
}))

async function loadImagePicker(hybrid: unknown = null) {
  vi.resetModules()
  const { NitroModules } = await import('react-native-nitro-modules')
  vi.mocked(NitroModules.hasHybridObject).mockReturnValue(hybrid !== null)
  vi.mocked(NitroModules.createHybridObject).mockReturnValue(hybrid as never)
  const module = await import('../src/platform/image-picker/index.native')
  return { ImagePicker: module.ImagePicker, NitroModules }
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
  it('throws synchronously from the launches, rejects from the permission reads', async () => {
    const { ImagePicker } = await loadImagePicker()
    expect(() => ImagePicker.launchLibrary()).toThrow(
      'ImagePicker.launchLibrary needs a native build'
    )
    expect(() => ImagePicker.launchCamera()).toThrow(
      'ImagePicker.launchCamera needs a native build'
    )
    await expect(ImagePicker.getCameraPermissions()).rejects.toThrow(
      'ImagePicker.getCameraPermissions needs a native build'
    )
    await expect(ImagePicker.requestCameraPermissions()).rejects.toThrow(
      'ImagePicker.requestCameraPermissions needs a native build'
    )
  })

  it('validates arguments synchronously through the namespace', async () => {
    const { ImagePicker } = await loadImagePicker()
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
})

describe('ImagePicker with its hybrid object', () => {
  it('validates before reaching the hybrid object', async () => {
    const { ImagePicker, NitroModules } = await loadImagePicker({
      launchLibrary: vi.fn(),
      launchCamera: vi.fn(),
    })
    expect(() => ImagePicker.launchLibrary({ mediaTypes: [] })).toThrow(/mediaTypes/)
    expect(() =>
      ImagePicker.launchCamera({ mediaTypes: ['images', 'videos'] })
    ).toThrow(/launchCamera.*video/)
    expect(NitroModules.createHybridObject).not.toHaveBeenCalled()
  })

  it('passes resolved options through and narrows the flat result', async () => {
    const asset = { uri: 'file:///a.jpg', width: 80, height: 120, mimeType: 'image/jpeg' }
    const launchLibrary = vi
      .fn()
      .mockResolvedValueOnce({ canceled: true })
      .mockResolvedValueOnce({ canceled: false, assets: [asset] })
    const { ImagePicker } = await loadImagePicker({ launchLibrary })
    expect(
      await ImagePicker.launchLibrary({ mediaTypes: ['images', 'videos'], selectionLimit: 3 })
    ).toEqual({ canceled: true, assets: null })
    expect(await ImagePicker.launchLibrary()).toEqual({ canceled: false, assets: [asset] })
    expect(launchLibrary).toHaveBeenNthCalledWith(1, {
      mediaTypes: ['images', 'videos'],
      selectionLimit: 3,
    })
  })

  it('splits the code off native rejections, including android printed ones', async () => {
    const { ImagePicker } = await loadImagePicker({
      launchCamera: vi.fn(async () => {
        throw new Error('E_IMAGE_PICKER_FAILED: ImagePicker.launchCamera: the camera returned no image')
      }),
      requestCameraPermissions: vi.fn(async () => {
        throw new Error(
          'E_IMAGE_PICKER_FAILED: ImagePicker.requestCameraPermissions: found no activity to prompt from\n'
        )
      }),
    })
    const camera = await ImagePicker.launchCamera().catch((error) => error)
    expect(camera.message).toBe('ImagePicker.launchCamera: the camera returned no image')
    expect(camera.code).toBe('E_IMAGE_PICKER_FAILED')
    const request = await ImagePicker.requestCameraPermissions().catch((error) => error)
    expect(request.message).toBe(
      'ImagePicker.requestCameraPermissions: found no activity to prompt from'
    )
    expect(request.code).toBe('E_IMAGE_PICKER_FAILED')
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
