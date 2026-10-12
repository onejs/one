import type { DataScannerConfiguration, DataScannerRecognizedDataType, DataScannerTextContentType } from '../specs/OneDataScanner.nitro';
import type { DataScannerOptions } from './types';
export declare function scannerConfiguration(options: DataScannerOptions): DataScannerConfiguration;
export declare const RecognizedDataType: {
    text(languages?: string[], textContentType?: DataScannerTextContentType): DataScannerRecognizedDataType;
    barcode(symbologies?: string[]): DataScannerRecognizedDataType;
};
//# sourceMappingURL=configuration.d.ts.map