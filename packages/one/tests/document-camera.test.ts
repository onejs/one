import { describe, expect, it, vi } from 'vitest'
import { VNDocumentCameraViewController as WebController } from '../src/platform/vision-kit/index'

vi.mock('react-native-nitro-modules', () => ({
  NitroModules: { hasHybridObject: vi.fn(), createHybridObject: vi.fn() },
}))

async function load(native: unknown) {
  vi.resetModules()
  const { NitroModules } = await import('react-native-nitro-modules')
  vi.mocked(NitroModules.hasHybridObject).mockReturnValue(native !== null)
  vi.mocked(NitroModules.createHybridObject).mockImplementation(() => native as never)
  return (await import('../src/platform/vision-kit/index.native'))
    .VNDocumentCameraViewController
}

describe('VNDocumentCameraViewController', () => {
  it('reports web unavailable and rejects presentation', async () => {
    expect(WebController.isSupported).toBe(false)
    await expect(new WebController().present()).rejects.toThrow('needs an iOS build')
  })
  it('requires the native bridge instead of substituting a scanner', async () => {
    const Controller = await load(null)
    expect(() => new Controller()).toThrow('needs an iOS build')
  })
  it('reads native availability without presenting', async () => {
    const present = vi.fn()
    const Controller = await load({ isSupported: false, present })
    expect(Controller.isSupported).toBe(false)
    expect(present).not.toHaveBeenCalled()
  })
  it('preserves scan identity, routes delegates and leaves dismissal to the caller', async () => {
    let finish: (scan: unknown) => void = () => {}
    let cancel: () => void = () => {}
    let fail: (error: unknown) => void = () => {}
    const bridge = {
      present: vi.fn(async (_animated, a, b, c) => {
        finish = a
        cancel = b
        fail = c
      }),
      dismiss: vi.fn(async () => {}),
    }
    const Controller = await load(bridge)
    const controller = new Controller()
    const result = vi.fn()
    const canceled = vi.fn()
    controller.delegate = {
      documentCameraViewController: result,
      documentCameraViewControllerDidCancel: canceled,
    }
    await controller.present(false)
    const scan = { title: 'receipt', pageCount: 2, imageOfPage: vi.fn() }
    finish(scan)
    expect(result).toHaveBeenCalledWith(controller, { didFinishWith: scan })
    cancel()
    expect(canceled).toHaveBeenCalledWith(controller)
    const error = { domain: 'VisionKit', code: 7, localizedDescription: 'failure' }
    fail(error)
    expect(result).toHaveBeenCalledWith(controller, { didFailWith: error })
    expect(bridge.dismiss).not.toHaveBeenCalled()
    await controller.dismiss(false)
    expect(bridge.dismiss).toHaveBeenCalledWith(false)
    controller.delegate = null
    finish(scan)
    expect(result).toHaveBeenCalledTimes(2)
  })
  it('propagates presentation failure without invoking a success delegate', async () => {
    const Controller = await load({
      present: async () => {
        throw new Error('E_DOCUMENT_CAMERA_UNSUPPORTED: unavailable')
      },
    })
    const controller = new Controller()
    const callback = vi.fn()
    controller.delegate = { documentCameraViewController: callback }
    await expect(controller.present()).rejects.toMatchObject({
      code: 'E_DOCUMENT_CAMERA_UNSUPPORTED',
      message: 'unavailable',
    })
    expect(callback).not.toHaveBeenCalled()
  })
})
