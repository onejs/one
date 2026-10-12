import type { HybridObject } from 'react-native-nitro-modules';
import type { DocumentCameraImage } from './OneDocumentCamera.nitro';
export type DataScannerItemType = 'text' | 'barcode';
export type DataScannerQualityLevel = 'balanced' | 'fast' | 'accurate';
export type DataScannerTextContentType = 'dateTimeDuration' | 'emailAddress' | 'flightNumber' | 'fullStreetAddress' | 'shipmentTrackingNumber' | 'telephoneNumber' | 'URL' | 'currency';
export type DataScannerScanningUnavailable = 'unsupported' | 'cameraRestricted';
export interface DataScannerRecognizedDataType {
    type: DataScannerItemType;
    languages?: string[];
    textContentType?: DataScannerTextContentType;
    symbologies?: string[];
}
export interface DataScannerConfiguration {
    recognizedDataTypes: DataScannerRecognizedDataType[];
    qualityLevel: DataScannerQualityLevel;
    recognizesMultipleItems: boolean;
    isHighFrameRateTrackingEnabled: boolean;
    isPinchToZoomEnabled: boolean;
    isGuidanceEnabled: boolean;
    isHighlightingEnabled: boolean;
}
export interface DataScannerPoint {
    x: number;
    y: number;
}
export interface DataScannerRect {
    x: number;
    y: number;
    width: number;
    height: number;
}
export interface DataScannerBounds {
    topLeft: DataScannerPoint;
    topRight: DataScannerPoint;
    bottomRight: DataScannerPoint;
    bottomLeft: DataScannerPoint;
}
export interface DataScannerRecognizedItem {
    type: DataScannerItemType;
    id: string;
    bounds: DataScannerBounds;
    transcript?: string;
    payloadStringValue?: string;
}
export interface OneDataScanner extends HybridObject<{
    ios: 'swift';
}> {
    readonly isSupported: boolean;
    readonly isAvailable: boolean;
    readonly supportedTextRecognitionLanguages: string[];
    configure(configuration: DataScannerConfiguration): void;
    setDelegate(didZoom: () => void, didTapOn: (item: DataScannerRecognizedItem) => void, didAdd: (items: DataScannerRecognizedItem[], allItems: DataScannerRecognizedItem[]) => void, didUpdate: (items: DataScannerRecognizedItem[], allItems: DataScannerRecognizedItem[]) => void, didRemove: (items: DataScannerRecognizedItem[], allItems: DataScannerRecognizedItem[]) => void, becameUnavailable: (error: DataScannerScanningUnavailable) => void): void;
    regionOfInterest?: DataScannerRect;
    readonly isScanning: boolean;
    getMinZoomFactor(): number;
    getMaxZoomFactor(): number;
    zoomFactor: number;
    present(animated: boolean): Promise<void>;
    dismiss(animated: boolean): Promise<void>;
    startScanning(): void;
    stopScanning(): void;
    capturePhoto(): Promise<DocumentCameraImage>;
    subscribeRecognizedItems(onItems: (items: DataScannerRecognizedItem[]) => void, onEnd: () => void): number;
    unsubscribeRecognizedItems(id: number): void;
}
//# sourceMappingURL=OneDataScanner.nitro.d.ts.map