import type { DataScannerOptions, DataScannerViewControllerDelegate } from './types';
export type * from './types';
export declare class DataScannerViewController {
    static get isSupported(): boolean;
    static get isAvailable(): boolean;
    static get supportedTextRecognitionLanguages(): string[];
    static readonly RecognizedDataType: {
        text(languages?: string[], textContentType?: import("./types").DataScannerTextContentType): import("./types").DataScannerRecognizedDataType;
        barcode(symbologies?: string[]): import("./types").DataScannerRecognizedDataType;
    };
    private readonly native;
    private readonly configuration;
    delegate: DataScannerViewControllerDelegate<DataScannerViewController> | null;
    constructor(options: DataScannerOptions);
    get recognizedDataTypes(): any;
    get qualityLevel(): any;
    get recognizesMultipleItems(): any;
    get isHighFrameRateTrackingEnabled(): any;
    get isPinchToZoomEnabled(): any;
    get isGuidanceEnabled(): any;
    get isHighlightingEnabled(): any;
    get regionOfInterest(): import("../specs/OneDataScanner.nitro").DataScannerRect | undefined;
    set regionOfInterest(value: import("../specs/OneDataScanner.nitro").DataScannerRect | undefined);
    get isScanning(): boolean;
    get minZoomFactor(): number;
    get maxZoomFactor(): number;
    get zoomFactor(): number;
    set zoomFactor(value: number);
    get recognizedItems(): AsyncIterable<import("../specs/OneDataScanner.nitro").DataScannerRecognizedItem[]>;
    present(animated?: boolean): Promise<void>;
    dismiss(animated?: boolean): Promise<void>;
    startScanning(): void;
    stopScanning(): void;
    capturePhoto(): Promise<import("../specs/OneDocumentCamera.nitro").DocumentCameraImage>;
}
//# sourceMappingURL=index.native.d.ts.map