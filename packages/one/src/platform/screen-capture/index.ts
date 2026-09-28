import type { ScreenCaptureState } from '../specs/OneScreenCapture.nitro'

export type { ScreenCaptureState } from '../specs/OneScreenCapture.nitro'

const unsupported = (): never => {
  throw new Error('ScreenCapture requires an iOS native build')
}

export const ScreenCapture = Object.freeze({
  getState: (): Promise<ScreenCaptureState> => unsupported(),
  addStateListener: (_onChange: (state: ScreenCaptureState) => void): (() => void) => unsupported(),
  addScreenshotListener: (_onScreenshot: (timestampMs: number) => void): (() => void) => unsupported(),
})
