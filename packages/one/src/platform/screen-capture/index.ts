import type { ScreenCaptureResult, ScreenCaptureState } from '../specs/OneScreenCapture.nitro'

export type { ScreenCaptureResult, ScreenCaptureState } from '../specs/OneScreenCapture.nitro'

const unsupported = (): never => {
  throw new Error('ScreenCapture requires an iOS native build')
}

export const ScreenCapture = Object.freeze({
  getState: (): Promise<ScreenCaptureState> => unsupported(),
  captureWindow: (): Promise<ScreenCaptureResult> => unsupported(),
  captureView: (_viewTag: number): Promise<ScreenCaptureResult> => unsupported(),
  addStateListener: (_onChange: (state: ScreenCaptureState) => void): (() => void) => unsupported(),
  addScreenshotListener: (_onScreenshot: (timestampMs: number) => void): (() => void) => unsupported(),
})
