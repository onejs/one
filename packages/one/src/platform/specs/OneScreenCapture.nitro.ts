import type { HybridObject } from 'react-native-nitro-modules'

export type ScreenCaptureState = 'active' | 'inactive' | 'unspecified'

export interface OneScreenCapture extends HybridObject<{ ios: 'swift' }> {
  getState(): Promise<ScreenCaptureState>
  addStateListener(onChange: (state: ScreenCaptureState) => void): () => void
  addScreenshotListener(onScreenshot: (timestampMs: number) => void): () => void
}
