import type { HybridObject } from 'react-native-nitro-modules';
export type ScreenCaptureState = 'active' | 'inactive' | 'unspecified';
export interface ScreenCaptureResult {
    uri: string;
    width: number;
    height: number;
    size: number;
}
export interface OneScreenCapture extends HybridObject<{
    ios: 'swift';
}> {
    getState(): Promise<ScreenCaptureState>;
    captureWindow(): Promise<ScreenCaptureResult>;
    captureView(viewTag: number): Promise<ScreenCaptureResult>;
    addStateListener(onChange: (state: ScreenCaptureState) => void): () => void;
    addScreenshotListener(onScreenshot: (timestampMs: number) => void): () => void;
}
//# sourceMappingURL=OneScreenCapture.nitro.d.ts.map