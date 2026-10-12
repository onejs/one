import { scannerConfiguration, RecognizedDataType } from './configuration'
import type { DataScannerOptions, DataScannerViewControllerDelegate } from './types'
import type { DataScannerRect } from '../specs/OneDataScanner.nitro'
export type * from './types'
export class DataScannerViewController {
  static readonly isSupported = false
  static readonly isAvailable = false
  static readonly supportedTextRecognitionLanguages: string[] = []
  static readonly RecognizedDataType = RecognizedDataType
  private readonly configuration
  delegate: DataScannerViewControllerDelegate<DataScannerViewController> | null = null
  regionOfInterest: DataScannerRect | undefined
  constructor(options: DataScannerOptions) {
    this.configuration = scannerConfiguration(options)
  }
  get recognizedDataTypes() {
    return this.configuration.recognizedDataTypes
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
  private unavailable(): never {
    throw new Error('DataScannerViewController needs an iOS build')
  }
  get isScanning(): boolean {
    return false
  }
  get minZoomFactor(): number {
    return this.unavailable()
  }
  get maxZoomFactor(): number {
    return this.unavailable()
  }
  get zoomFactor(): number {
    return this.unavailable()
  }
  set zoomFactor(_value: number) {
    this.unavailable()
  }
  get recognizedItems(): AsyncIterable<import('./types').RecognizedItem[]> {
    return this.unavailable()
  }
  async present(_animated = true): Promise<void> {
    this.unavailable()
  }
  async dismiss(_animated = true): Promise<void> {
    this.unavailable()
  }
  startScanning(): void {
    this.unavailable()
  }
  stopScanning(): void {
    this.unavailable()
  }
  async capturePhoto(): Promise<import('../vision-kit/types').UIImage> {
    this.unavailable()
  }
}
