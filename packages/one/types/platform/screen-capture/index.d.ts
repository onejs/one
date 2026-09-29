import type { ScreenCaptureState, WindowCaptureResult } from '../specs/OneScreenCapture.nitro';
export type { ScreenCaptureState, WindowCaptureResult } from '../specs/OneScreenCapture.nitro';
export declare const ScreenCapture: Readonly<{
    getState: () => Promise<ScreenCaptureState>;
    captureWindow: () => Promise<WindowCaptureResult>;
    addStateListener: (_onChange: (state: ScreenCaptureState) => void) => (() => void);
    addScreenshotListener: (_onScreenshot: (timestampMs: number) => void) => (() => void);
}>;
//# sourceMappingURL=index.d.ts.map