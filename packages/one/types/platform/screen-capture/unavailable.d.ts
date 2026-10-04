import type { ScreenCaptureResult, ScreenCaptureState } from '../specs/OneScreenCapture.nitro';
export type { ScreenCaptureResult, ScreenCaptureState } from '../specs/OneScreenCapture.nitro';
export declare const ScreenCapture: Readonly<{
    getState: () => Promise<ScreenCaptureState>;
    captureWindow: () => Promise<ScreenCaptureResult>;
    captureView: (_viewTag: number) => Promise<ScreenCaptureResult>;
    addStateListener: (_onChange: (state: ScreenCaptureState) => void) => (() => void);
    addScreenshotListener: (_onScreenshot: (timestampMs: number) => void) => (() => void);
}>;
//# sourceMappingURL=unavailable.d.ts.map