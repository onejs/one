import { describe, expect, it, vi } from 'vitest'
import { DataScannerViewController as Web } from '../src/platform/data-scanner/index'
vi.mock('react-native-nitro-modules', () => ({
  NitroModules: { hasHybridObject: vi.fn(), createHybridObject: vi.fn() },
}))
async function load(native: unknown) {
  vi.resetModules()
  const { NitroModules } = await import('react-native-nitro-modules')
  vi.mocked(NitroModules.hasHybridObject).mockReturnValue(native !== null)
  vi.mocked(NitroModules.createHybridObject).mockImplementation(() => native as never)
  return (await import('../src/platform/data-scanner/index.native'))
    .DataScannerViewController
}
function bridge() {
  return {
    configure: vi.fn(),
    setDelegate: vi.fn(),
    isSupported: false,
    isAvailable: false,
    supportedTextRecognitionLanguages: ['en-US'],
    isScanning: false,
    present: vi.fn(async () => {}),
    dismiss: vi.fn(async () => {}),
    startScanning: vi.fn(),
    stopScanning: vi.fn(),
    capturePhoto: vi.fn(async () => ({ scale: 3 })),
    getMinZoomFactor: () => 1,
    getMaxZoomFactor: () => 6,
    subscribeRecognizedItems: vi.fn(),
    unsubscribeRecognizedItems: vi.fn(),
  }
}
describe('DataScannerViewController', () => {
  it('reports web unavailable and rejects native operations without fake recognition', async () => {
    expect(Web.isSupported).toBe(false)
    expect(Web.isAvailable).toBe(false)
    const scanner = new Web({ recognizedDataTypes: [Web.RecognizedDataType.text()] })
    expect(scanner.isScanning).toBe(false)
    await expect(scanner.present()).rejects.toThrow('iOS build')
    expect(() => scanner.startScanning()).toThrow('iOS build')
    expect(() => scanner.recognizedItems).toThrow('iOS build')
    await expect(scanner.capturePhoto()).rejects.toThrow('iOS build')
    const Native = await load(null)
    expect(() => new Native({ recognizedDataTypes: [] })).toThrow('iOS build')
  })
  it('preserves SDK initializer defaults, text/code filters and independent configuration', async () => {
    const native = bridge()
    const Scanner = await load(native)
    expect(Scanner.isSupported).toBe(false)
    expect(Scanner.supportedTextRecognitionLanguages).toEqual(['en-US'])
    expect(native.present).not.toHaveBeenCalled()
    const languages = ['en-US']
    const scanner = new Scanner({
      recognizedDataTypes: [
        Scanner.RecognizedDataType.text(languages, 'URL'),
        Scanner.RecognizedDataType.barcode(['QR']),
      ],
    })
    languages.push('fr-FR')
    expect(native.configure).toHaveBeenCalledWith({
      recognizedDataTypes: [
        {
          type: 'text',
          languages: ['en-US'],
          textContentType: 'URL',
          symbologies: undefined,
        },
        { type: 'barcode', symbologies: ['QR'], languages: undefined },
      ],
      qualityLevel: 'balanced',
      recognizesMultipleItems: false,
      isHighFrameRateTrackingEnabled: true,
      isPinchToZoomEnabled: true,
      isGuidanceEnabled: true,
      isHighlightingEnabled: false,
    })
    scanner.recognizedDataTypes[0].languages?.push('de-DE')
    expect(scanner.recognizedDataTypes[0].languages).toEqual(['en-US'])
    expect(scanner.qualityLevel).toBe('balanced')
  })
  it('delivers all labeled delegate events with sender identity without dismissing', async () => {
    const native = bridge()
    const Scanner = await load(native)
    const scanner = new Scanner({ recognizedDataTypes: [] })
    const callback = vi.fn()
    const zoom = vi.fn()
    scanner.delegate = { dataScanner: callback, dataScannerDidZoom: zoom }
    const [didZoom, tap, add, update, remove, unavailable] =
      native.setDelegate.mock.calls[0]
    const item = { id: 'id', type: 'text', transcript: 'hello' }
    const all = [item]
    didZoom()
    tap(item)
    add(all, all)
    update(all, all)
    remove(all, [])
    unavailable('cameraRestricted')
    expect(zoom).toHaveBeenCalledWith(scanner)
    expect(callback.mock.calls).toEqual([
      [scanner, { didTapOn: item }],
      [scanner, { didAdd: all, allItems: all }],
      [scanner, { didUpdate: all, allItems: all }],
      [scanner, { didRemove: all, allItems: [] }],
      [scanner, { becameUnavailableWithError: 'cameraRestricted' }],
    ])
    expect(native.dismiss).not.toHaveBeenCalled()
    scanner.delegate = null
    tap(item)
    expect(callback).toHaveBeenCalledTimes(5)
  })
  it('streams ordered batches, pending reads and cancellation without using delegate snapshots', async () => {
    const native = bridge()
    let nextID = 0
    native.subscribeRecognizedItems.mockImplementation(() => ++nextID)
    const Scanner = await load(native)
    const scanner = new Scanner({ recognizedDataTypes: [] })
    const iterator = scanner.recognizedItems[Symbol.asyncIterator]()
    const other = scanner.recognizedItems[Symbol.asyncIterator]()
    const [emit, end] = native.subscribeRecognizedItems.mock.calls[0]
    const first = [{ id: 'one', transcript: 'a' }]
    const second = [{ id: 'one', transcript: 'b' }]
    emit(first)
    emit(second)
    emit([])
    expect(await iterator.next()).toEqual({ done: false, value: first })
    expect(await iterator.next()).toEqual({ done: false, value: second })
    expect(await iterator.next()).toEqual({ done: false, value: [] })
    const pending = iterator.next()
    emit(second)
    expect(await pending).toEqual({ done: false, value: second })
    const canceled = iterator.next()
    await iterator.return?.()
    expect(await canceled).toEqual({ done: true, value: undefined })
    expect(native.unsubscribeRecognizedItems).toHaveBeenCalledWith(1)
    emit(first)
    expect(await iterator.next()).toEqual({ done: true, value: undefined })
    const otherPending = other.next()
    native.subscribeRecognizedItems.mock.calls[1][1]()
    expect(await otherPending).toEqual({ done: true, value: undefined })
    end()
  })
  it('forwards native state and rejects unavailable start/presentation/photo without delegate success', async () => {
    const native = bridge()
    const Scanner = await load(native)
    const scanner = new Scanner({ recognizedDataTypes: [] })
    const region = { x: 2, y: 3, width: 100, height: 200 }
    scanner.regionOfInterest = region
    scanner.zoomFactor = 2
    expect(scanner.regionOfInterest).toEqual(region)
    expect(scanner.zoomFactor).toBe(2)
    expect(scanner.minZoomFactor).toBe(1)
    expect(scanner.maxZoomFactor).toBe(6)
    await scanner.present(false)
    await scanner.dismiss(false)
    expect(native.present).toHaveBeenCalledWith(false)
    expect(native.dismiss).toHaveBeenCalledWith(false)
    scanner.stopScanning()
    expect(native.stopScanning).toHaveBeenCalledOnce()
    expect(await scanner.capturePhoto()).toEqual({ scale: 3 })
    const fail = () => {
      throw new Error('E_DATA_SCANNER_UNSUPPORTED: unsupported')
    }
    native.startScanning.mockImplementation(fail)
    native.present.mockImplementation(async () => fail())
    native.capturePhoto.mockImplementation(async () => fail())
    expect(() => scanner.startScanning()).toThrow('unsupported')
    await expect(scanner.present()).rejects.toMatchObject({
      code: 'E_DATA_SCANNER_UNSUPPORTED',
    })
    await expect(scanner.capturePhoto()).rejects.toMatchObject({
      code: 'E_DATA_SCANNER_UNSUPPORTED',
    })
  })
})
