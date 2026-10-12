import type { DataScannerOptions, DataScannerViewControllerDelegate } from './types';
import type { DataScannerRect } from '../specs/OneDataScanner.nitro';
export type * from './types';
export declare class DataScannerViewController {
    static readonly isSupported = false;
    static readonly isAvailable = false;
    static readonly supportedTextRecognitionLanguages: string[];
    static readonly RecognizedDataType: {
        text(languages?: string[], textContentType?: import("./types").DataScannerTextContentType): import("./types").DataScannerRecognizedDataType;
        barcode(symbologies?: string[]): import("./types").DataScannerRecognizedDataType;
    };
    private readonly configuration;
    delegate: DataScannerViewControllerDelegate<DataScannerViewController> | null;
    regionOfInterest: DataScannerRect | undefined;
    constructor(options: DataScannerOptions);
    get recognizedDataTypes(): any;
    get qualityLevel(): any;
    get recognizesMultipleItems(): any;
    get isHighFrameRateTrackingEnabled(): any;
    get isPinchToZoomEnabled(): any;
    get isGuidanceEnabled(): any;
    get isHighlightingEnabled(): any;
    private unavailable;
    get isScanning(): boolean;
    get minZoomFactor(): number;
    get maxZoomFactor(): number;
    get zoomFactor(): number;
    set zoomFactor(_value: number);
    get recognizedItems(): AsyncIterable<import('./types').RecognizedItem[]>;
    present(_animated?: boolean): Promise<void>;
    dismiss(_animated?: boolean): Promise<void>;
    startScanning(): void;
    stopScanning(): void;
    capturePhoto(): Promise<import('../vision-kit/types').UIImage>;
}
//# sourceMappingURL=index.d.ts.map