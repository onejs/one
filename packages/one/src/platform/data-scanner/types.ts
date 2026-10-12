import type {
  DataScannerConfiguration,
  DataScannerRecognizedItem,
  DataScannerRect,
  DataScannerScanningUnavailable,
} from '../specs/OneDataScanner.nitro'
import type { UIImage } from '../vision-kit/types'
export type {
  DataScannerQualityLevel,
  DataScannerTextContentType,
  DataScannerScanningUnavailable,
  DataScannerRecognizedDataType,
  DataScannerBounds,
} from '../specs/OneDataScanner.nitro'
export type RecognizedItem = DataScannerRecognizedItem
export type DataScannerOptions = Pick<DataScannerConfiguration, 'recognizedDataTypes'> &
  Partial<Omit<DataScannerConfiguration, 'recognizedDataTypes'>>
export interface DataScannerViewControllerDelegate<Controller = DataScannerController> {
  dataScannerDidZoom?(dataScanner: Controller): void
  dataScanner?(
    dataScanner: Controller,
    event:
      | { didTapOn: RecognizedItem }
      | { didAdd: RecognizedItem[]; allItems: RecognizedItem[] }
      | { didUpdate: RecognizedItem[]; allItems: RecognizedItem[] }
      | { didRemove: RecognizedItem[]; allItems: RecognizedItem[] }
      | { becameUnavailableWithError: DataScannerScanningUnavailable }
  ): void
}
export interface DataScannerAvailability {
  readonly isSupported: boolean
  readonly isAvailable: boolean
  readonly supportedTextRecognitionLanguages: string[]
}
export interface DataScannerController extends Readonly<DataScannerConfiguration> {
  delegate: DataScannerViewControllerDelegate | null
  regionOfInterest: DataScannerRect | undefined
  readonly isScanning: boolean
  readonly minZoomFactor: number
  readonly maxZoomFactor: number
  zoomFactor: number
  readonly recognizedItems: AsyncIterable<RecognizedItem[]>
  present(animated?: boolean): Promise<void>
  dismiss(animated?: boolean): Promise<void>
  startScanning(): void
  stopScanning(): void
  capturePhoto(): Promise<UIImage>
}
