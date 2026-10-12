import type { ScreenCaptureResult, ScreenCaptureState } from '../specs/OneScreenCapture.nitro';
export type { ScreenCaptureResult, ScreenCaptureState, } from '../specs/OneScreenCapture.nitro';
declare function getState(): Promise<ScreenCaptureState>;
declare function captureWindow(): Promise<ScreenCaptureResult>;
declare function captureView(viewTag: number): Promise<ScreenCaptureResult>;
declare function addStateListener(onChange: (state: ScreenCaptureState) => void): () => void;
declare function addScreenshotListener(onScreenshot: (timestampMs: number) => void): () => void;
declare function prevent(key?: string): Promise<void>;
declare function allow(key?: string): Promise<void>;
declare function isPrevented(): Promise<boolean>;
declare function usePreventScreenCapture(key?: string): void;
export declare const ScreenCapture: Readonly<{
    getState: typeof getState;
    captureWindow: typeof captureWindow;
    captureView: typeof captureView;
    addStateListener: typeof addStateListener;
    addScreenshotListener: typeof addScreenshotListener;
    prevent: typeof prevent;
    allow: typeof allow;
    isPrevented: typeof isPrevented;
}>;
export { usePreventScreenCapture };
//# sourceMappingURL=index.native.d.ts.map