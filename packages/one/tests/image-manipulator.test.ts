import { afterEach, describe, expect, it, vi } from 'vitest'
import { ImageManipulator as WebImageManipulator } from '../src/platform/image-manipulator/index'

vi.mock('react-native-nitro-modules', () => ({
  NitroModules: { createHybridObject: vi.fn() },
}))

afterEach(() => {
  vi.unstubAllGlobals()
  vi.resetModules()
})

async function loadNativeEntry(hybrid: unknown) {
  vi.resetModules()
  const { NitroModules } = await import('react-native-nitro-modules')
  vi.mocked(NitroModules.createHybridObject).mockReturnValue(hybrid as never)
  return import('../src/platform/image-manipulator/index.native')
}

const FLIP_MESSAGE = "ImageManipulator.transform: flip must be 'horizontal' or 'vertical'"

function stubBrowser() {
  const calls: { scale: [number, number][]; blob: { mime: string; quality: number }[] } = {
    scale: [],
    blob: [],
  }
  const context = {
    translate: vi.fn(),
    rotate: vi.fn(),
    scale: vi.fn((x: number, y: number) => {
      calls.scale.push([x, y])
    }),
    drawImage: vi.fn(),
  }
  const canvas = () => ({
    width: 0,
    height: 0,
    getContext: () => context,
    toBlob: (done: (blob: Blob | null) => void, mime: string, quality: number) => {
      calls.blob.push({ mime, quality })
      done(new Blob(['pixels'], { type: mime }))
    },
  })
  vi.stubGlobal('window', {
    Image: class {
      crossOrigin = ''
      src = ''
      naturalWidth = 80
      naturalHeight = 120
      async decode() {}
    },
  })
  vi.stubGlobal('document', { createElement: () => canvas() })
  vi.stubGlobal('URL', { createObjectURL: () => 'blob:mock' })
  return calls
}

describe('image-manipulator flip and webp', () => {
  it('passes flip and webp through to the hybrid object', async () => {
    const result = { uri: 'file:///cache/out.webp', width: 80, height: 120, size: 42 }
    const transform = vi.fn(async () => result)
    const { ImageManipulator } = await loadNativeEntry({ transform })
    await expect(
      ImageManipulator.transform('file:///cache/in.png', {
        flip: 'horizontal',
        format: 'webp',
        quality: 0.7,
      })
    ).resolves.toEqual(result)
    expect(transform).toHaveBeenCalledWith('file:///cache/in.png', {
      flip: 'horizontal',
      format: 'webp',
      quality: 0.7,
    })
  })

  it('defaults the native format to jpeg', async () => {
    const result = { uri: 'file:///cache/out.jpg', width: 8, height: 8, size: 9 }
    const transform = vi.fn(async () => result)
    const { ImageManipulator } = await loadNativeEntry({ transform })
    await ImageManipulator.transform('file:///cache/in.png', { flip: 'vertical' })
    expect(transform).toHaveBeenCalledWith('file:///cache/in.png', {
      flip: 'vertical',
      format: 'jpeg',
    })
  })

  it('throws synchronously for an unknown flip on native and web', async () => {
    const { ImageManipulator } = await loadNativeEntry({ transform: vi.fn() })
    expect(() =>
      ImageManipulator.transform('file:///cache/in.png', {
        flip: 'diagonal' as never,
      })
    ).toThrow(FLIP_MESSAGE)
    stubBrowser()
    await expect(
      WebImageManipulator.transform('blob:source', { flip: 'diagonal' as never })
    ).rejects.toThrow(FLIP_MESSAGE)
  })

  it('mirrors the canvas for each flip axis on web', async () => {
    const calls = stubBrowser()
    await WebImageManipulator.transform('blob:source', {
      flip: 'horizontal',
      format: 'png',
    })
    expect(calls.scale).toEqual([[-1, 1]])
    vi.resetModules()
    const calls2 = stubBrowser()
    const out = await WebImageManipulator.transform('blob:source', {
      flip: 'vertical',
      format: 'webp',
      quality: 0.5,
    })
    expect(calls2.scale).toEqual([[1, -1]])
    expect(calls2.blob).toEqual([{ mime: 'image/webp', quality: 0.5 }])
    expect(out.uri).toBe('blob:mock')
  })

  it('flips the rotated image on web, as native does', async () => {
    // track the canvas matrix and map the source's upper-left corner through it.
    let m = [1, 0, 0, 1, 0, 0]
    let corner: number[] = []
    const multiply = ([g, h, i, j, k, l]: number[]) => {
      const [a, b, c, d, e, f] = m
      m = [a * g + c * h, b * g + d * h, a * i + c * j, b * i + d * j, a * k + c * l + e, b * k + d * l + f]
    }
    const context = {
      translate: (x: number, y: number) => multiply([1, 0, 0, 1, x, y]),
      rotate: (r: number) => multiply([Math.cos(r), Math.sin(r), -Math.sin(r), Math.cos(r), 0, 0]),
      scale: (x: number, y: number) => multiply([x, 0, 0, y, 0, 0]),
      drawImage: (_image: unknown, x: number, y: number) => {
        corner = [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]]
      },
    }
    vi.stubGlobal('window', { Image: class { naturalWidth = 2; naturalHeight = 3; async decode() {} } })
    vi.stubGlobal('document', {
      createElement: () => ({ width: 0, height: 0, getContext: () => context, toBlob: (done: (b: Blob) => void) => done(new Blob(['x'])) }),
    })
    vi.stubGlobal('URL', { createObjectURL: () => 'blob:mock' })
    await WebImageManipulator.transform('blob:source', { rotate: 90, flip: 'horizontal', format: 'png' })
    // a 2x3 image turned 90 degrees clockwise puts its upper-left corner at the
    // top right (3, 0); mirroring that result brings it to (0, 0).
    expect(corner[0]).toBeCloseTo(0)
    expect(corner[1]).toBeCloseTo(0)
  })

  it('accepts quality for webp but rejects it for png on web', async () => {
    stubBrowser()
    await expect(
      WebImageManipulator.transform('blob:source', { format: 'webp', quality: 0.8 })
    ).resolves.toMatchObject({ uri: 'blob:mock' })
    await expect(
      WebImageManipulator.transform('blob:source', { format: 'png', quality: 0.8 })
    ).rejects.toThrow(
      'ImageManipulator.transform: quality applies only to JPEG or WebP and must be between 0 and 1'
    )
  })
})
