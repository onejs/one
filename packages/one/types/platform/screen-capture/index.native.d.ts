import type { ScreenCaptureState, WindowCaptureResult } from '../specs/OneScreenCapture.nitro';
export type { ScreenCaptureState, WindowCaptureResult } from '../specs/OneScreenCapture.nitro';
declare function getState(): Promise<ScreenCaptureState>;
declare function captureWindow(): Promise<WindowCaptureResult>;
declare function addStateListener(onChange: (state: ScreenCaptureState) => void): () => void;
declare function addScreenshotListener(onScreenshot: (timestampMs: number) => void): () => void;
export declare const ScreenCapture: Readonly<{
    getState: typeof getState;
    captureWindow: typeof captureWindow;
    addStateListener: typeof addStateListener;
    addScreenshotListener: typeof addScreenshotListener;
}>;
//# sourceMappingURL=index.native.d.ts.map