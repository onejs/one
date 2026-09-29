import type { ScreenCaptureResult, ScreenCaptureState } from '../specs/OneScreenCapture.nitro';
export type { ScreenCaptureResult, ScreenCaptureState } from '../specs/OneScreenCapture.nitro';
declare function getState(): Promise<ScreenCaptureState>;
declare function captureWindow(): Promise<ScreenCaptureResult>;
declare function captureView(viewTag: number): Promise<ScreenCaptureResult>;
declare function addStateListener(onChange: (state: ScreenCaptureState) => void): () => void;
declare function addScreenshotListener(onScreenshot: (timestampMs: number) => void): () => void;
export declare const ScreenCapture: Readonly<{
    getState: typeof getState;
    captureWindow: typeof captureWindow;
    captureView: typeof captureView;
    addStateListener: typeof addStateListener;
    addScreenshotListener: typeof addScreenshotListener;
}>;
//# sourceMappingURL=index.native.d.ts.map