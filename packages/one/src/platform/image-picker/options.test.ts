import { describe, expect, test } from 'vitest'
import { resolveCameraOptions, resolveImagePickerOptions } from './options'

describe('image picker options', () => {
  test('defaults pick one image at full quality', () => {
    expect(resolveImagePickerOptions({})).toEqual({
      mediaTypes: ['images'],
      selectionLimit: 1,
      allowsEditing: false,
      aspect: undefined,
      quality: 1,
      videoMaxDuration: 0,
      videoQuality: 'high',
    })
  })

  test('crop needs a single image pick', () => {
    expect(
      resolveImagePickerOptions({ allowsEditing: true }).allowsEditing
    ).toBe(true)
    expect(() =>
      resolveImagePickerOptions({ allowsEditing: true, selectionLimit: 2 })
    ).toThrow('ImagePicker.launchLibrary: allowsEditing needs a single pick')
    expect(() =>
      resolveImagePickerOptions({ allowsEditing: true, mediaTypes: 'videos' })
    ).toThrow(`ImagePicker.launchLibrary: allowsEditing only supports images`)
    expect(
      resolveImagePickerOptions({ allowsEditing: true, aspect: [4, 3] }).aspect
    ).toEqual({ x: 4, y: 3 })
    expect(() =>
      resolveImagePickerOptions({ allowsEditing: true, aspect: [0, 3] })
    ).toThrow('ImagePicker.launchLibrary: aspect must be [x, y] of positive numbers')
  })

  test('quality and video fields validate', () => {
    expect(resolveImagePickerOptions({ quality: 0.5 }).quality).toBe(0.5)
    expect(() => resolveImagePickerOptions({ quality: 2 })).toThrow(
      'ImagePicker.launchLibrary: quality must be a number from 0 to 1'
    )
    expect(resolveImagePickerOptions({ videoMaxDuration: 30 }).videoMaxDuration).toBe(30)
    expect(() => resolveImagePickerOptions({ videoMaxDuration: -1 })).toThrow(
      'ImagePicker.launchLibrary: videoMaxDuration must be a nonnegative number'
    )
    expect(() => resolveImagePickerOptions({ videoQuality: 'ultra' as never })).toThrow(
      `ImagePicker.launchLibrary: videoQuality must be 'high', 'medium' or 'low'`
    )
  })

  test('camera accepts video and keeps the crop rules', () => {
    const video = resolveCameraOptions({ mediaTypes: 'videos' })
    expect(video.mediaTypes).toEqual(['videos'])
    expect(() =>
      resolveCameraOptions({ mediaTypes: 'videos', allowsEditing: true })
    ).toThrow('ImagePicker.launchCamera: allowsEditing only supports images')
    const photo = resolveCameraOptions({ allowsEditing: true })
    expect(photo.allowsEditing).toBe(true)
  })
})
