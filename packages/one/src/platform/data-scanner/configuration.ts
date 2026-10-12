import type {
  DataScannerConfiguration,
  DataScannerRecognizedDataType,
  DataScannerTextContentType,
} from '../specs/OneDataScanner.nitro'
import type { DataScannerOptions } from './types'

export function scannerConfiguration(
  options: DataScannerOptions
): DataScannerConfiguration {
  return {
    recognizedDataTypes: options.recognizedDataTypes.map((value) => ({
      ...value,
      languages: value.languages?.slice(),
      symbologies: value.symbologies?.slice(),
    })),
    qualityLevel: options.qualityLevel ?? 'balanced',
    recognizesMultipleItems: options.recognizesMultipleItems ?? false,
    isHighFrameRateTrackingEnabled: options.isHighFrameRateTrackingEnabled ?? true,
    isPinchToZoomEnabled: options.isPinchToZoomEnabled ?? true,
    isGuidanceEnabled: options.isGuidanceEnabled ?? true,
    isHighlightingEnabled: options.isHighlightingEnabled ?? false,
  }
}

export const RecognizedDataType = {
  text(
    languages: string[] = [],
    textContentType?: DataScannerTextContentType
  ): DataScannerRecognizedDataType {
    return { type: 'text', languages, textContentType }
  },
  barcode(symbologies: string[] = []): DataScannerRecognizedDataType {
    return { type: 'barcode', symbologies }
  },
}
