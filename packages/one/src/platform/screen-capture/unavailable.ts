import { missingNativeBuild } from '../nativeError'
import type { ScreenCaptureResult, ScreenCaptureState } from '../specs/OneScreenCapture.nitro'

export type { ScreenCaptureResult, ScreenCaptureState } from '../specs/OneScreenCapture.nitro'

export const ScreenCapture = Object.freeze({
  getState: (): Promise<ScreenCaptureState> => Promise.resolve('unspecified'),
  captureWindow: (): Promise<ScreenCaptureResult> => Promise.reject(missingNativeBuild('ScreenCapture.captureWindow')),
  captureView: (_viewTag: number): Promise<ScreenCaptureResult> => Promise.reject(missingNativeBuild('ScreenCapture.captureView')),
  addStateListener: (_onChange: (state: ScreenCaptureState) => void): (() => void) => () => {},
  addScreenshotListener: (_onScreenshot: (timestampMs: number) => void): (() => void) => () => {},
})
