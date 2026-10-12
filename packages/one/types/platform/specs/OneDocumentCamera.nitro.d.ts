import type { HybridObject } from 'react-native-nitro-modules';
export interface DocumentCameraError {
    domain: string;
    code: number;
    localizedDescription: string;
}
export interface DocumentCameraImageSize {
    width: number;
    height: number;
}
export interface DocumentCameraImage extends HybridObject<{
    ios: 'swift';
}> {
    readonly size: DocumentCameraImageSize;
    readonly scale: number;
    pngData(): ArrayBuffer | undefined;
    jpegData(compressionQuality: number): ArrayBuffer | undefined;
}
export interface DocumentCameraScan extends HybridObject<{
    ios: 'swift';
}> {
    readonly title: string;
    readonly pageCount: number;
    imageOfPage(at: number): DocumentCameraImage;
}
export interface OneDocumentCamera extends HybridObject<{
    ios: 'swift';
}> {
    readonly isSupported: boolean;
    present(animated: boolean, didFinish: (scan: DocumentCameraScan) => void, didCancel: () => void, didFail: (error: DocumentCameraError) => void): Promise<void>;
    dismiss(animated: boolean): Promise<void>;
}
//# sourceMappingURL=OneDocumentCamera.nitro.d.ts.map