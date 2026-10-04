import type { ScreenCaptureResult, ScreenCaptureState } from '../specs/OneScreenCapture.nitro';
export type { ScreenCaptureResult, ScreenCaptureState, } from '../specs/OneScreenCapture.nitro';
export declare const ScreenCapture: Readonly<{
    getState: () => Promise<ScreenCaptureState>;
    captureWindow: () => Promise<ScreenCaptureResult>;
    captureView: (viewTag: number) => Promise<ScreenCaptureResult>;
    addStateListener: (onChange: (state: ScreenCaptureState) => void) => (() => void);
    addScreenshotListener: (onScreenshot: (timestampMs: number) => void) => (() => void);
}>;
//# sourceMappingURL=unavailable.d.ts.map