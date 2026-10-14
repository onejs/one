import type { ViewProps } from 'react-native';
export type CameraFacing = 'back' | 'front';
export type CameraCodeType = 'qr' | 'ean13' | 'ean8' | 'upce' | 'code128' | 'code39' | 'code93' | 'pdf417' | 'aztec' | 'dataMatrix';
export type CameraState = 'inactive' | 'permission-required' | 'unavailable' | 'ready' | 'unsupported' | 'failed';
export interface CameraCode {
    type: CameraCodeType;
    data: string;
}
export type CameraFlashMode = 'off' | 'on' | 'auto';
export interface CameraViewProps extends ViewProps {
    active?: boolean;
    facing?: CameraFacing;
    codeTypes?: readonly CameraCodeType[];
    flash?: CameraFlashMode;
    enableTorch?: boolean;
    zoom?: number;
    onStateChange?: (state: CameraState) => void;
    onCodeScanned?: (code: CameraCode) => void;
}
export interface CameraPictureOptions {
    quality?: number;
    base64?: boolean;
}
export interface CameraCapturedPicture {
    uri: string;
    width: number;
    height: number;
    format: 'jpg';
    base64?: string;
}
export interface CameraViewRef {
    takePicture(options?: CameraPictureOptions): Promise<CameraCapturedPicture>;
}
//# sourceMappingURL=types.d.ts.map