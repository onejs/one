import type { ScreenCaptureState } from '../specs/OneScreenCapture.nitro';
export type { ScreenCaptureState } from '../specs/OneScreenCapture.nitro';
declare function getState(): Promise<ScreenCaptureState>;
declare function addStateListener(onChange: (state: ScreenCaptureState) => void): () => void;
declare function addScreenshotListener(onScreenshot: (timestampMs: number) => void): () => void;
export declare const ScreenCapture: Readonly<{
    getState: typeof getState;
    addStateListener: typeof addStateListener;
    addScreenshotListener: typeof addScreenshotListener;
}>;
//# sourceMappingURL=index.native.d.ts.map