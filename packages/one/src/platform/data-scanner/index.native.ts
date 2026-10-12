import { NitroModules } from 'react-native-nitro-modules'
import type { OneDataScanner } from '../specs/OneDataScanner.nitro'
import { rethrowNativeError } from '../nativeError'
import { scannerConfiguration, RecognizedDataType } from './configuration'
import { recognizedItems } from './recognizedItems'
import type { DataScannerOptions, DataScannerViewControllerDelegate } from './types'
export type * from './types'
function create(): OneDataScanner {
  if (!NitroModules.hasHybridObject('OneDataScanner'))
    throw new Error('DataScannerViewController needs an iOS build')
  return NitroModules.createHybridObject<OneDataScanner>('OneDataScanner')
}
let capabilities: OneDataScanner | undefined
export class DataScannerViewController {
  static get isSupported() {
    return (capabilities ??= create()).isSupported
  }
  static get isAvailable() {
    return (capabilities ??= create()).isAvailable
  }
  static get supportedTextRecognitionLanguages() {
    return (capabilities ??= create()).supportedTextRecognitionLanguages
  }
  static readonly RecognizedDataType = RecognizedDataType
  private readonly native = create()
  private readonly configuration
  delegate: DataScannerViewControllerDelegate<DataScannerViewController> | null = null
  constructor(options: DataScannerOptions) {
    this.configuration = scannerConfiguration(options)
    this.native.configure(this.configuration)
    this.native.setDelegate(
      () => this.delegate?.dataScannerDidZoom?.(this),
      (item) => this.delegate?.dataScanner?.(this, { didTapOn: item }),
      (items, allItems) =>
        this.delegate?.dataScanner?.(this, { didAdd: items, allItems }),
      (items, allItems) =>
        this.delegate?.dataScanner?.(this, { didUpdate: items, allItems }),
      (items, allItems) =>
        this.delegate?.dataScanner?.(this, { didRemove: items, allItems }),
      (error) => this.delegate?.dataScanner?.(this, { becameUnavailableWithError: error })
    )
  }
  get recognizedDataTypes() {
    return this.configuration.recognizedDataTypes.map((value) => ({
      ...value,
      languages: value.languages?.slice(),
      symbologies: value.symbologies?.slice(),
    }))
  }
  get qualityLevel() {
    return this.configuration.qualityLevel
  }
  get recognizesMultipleItems() {
    return this.configuration.recognizesMultipleItems
  }
  get isHighFrameRateTrackingEnabled() {
    return this.configuration.isHighFrameRateTrackingEnabled
  }
  get isPinchToZoomEnabled() {
    return this.configuration.isPinchToZoomEnabled
  }
  get isGuidanceEnabled() {
    return this.configuration.isGuidanceEnabled
  }
  get isHighlightingEnabled() {
    return this.configuration.isHighlightingEnabled
  }
  get regionOfInterest() {
    return this.native.regionOfInterest
  }
  set regionOfInterest(value) {
    this.native.regionOfInterest = value
  }
  get isScanning() {
    return this.native.isScanning
  }
  get minZoomFactor() {
    return this.native.getMinZoomFactor()
  }
  get maxZoomFactor() {
    return this.native.getMaxZoomFactor()
  }
  get zoomFactor() {
    return this.native.zoomFactor
  }
  set zoomFactor(value) {
    this.native.zoomFactor = value
  }
  get recognizedItems() {
    return recognizedItems(this.native)
  }
  present(animated = true) {
    return this.native.present(animated).catch(rethrowNativeError)
  }
  dismiss(animated = true) {
    return this.native.dismiss(animated).catch(rethrowNativeError)
  }
  startScanning() {
    try {
      this.native.startScanning()
    } catch (error) {
      rethrowNativeError(error)
    }
  }
  stopScanning() {
    this.native.stopScanning()
  }
  capturePhoto() {
    return this.native.capturePhoto().catch(rethrowNativeError)
  }
}
