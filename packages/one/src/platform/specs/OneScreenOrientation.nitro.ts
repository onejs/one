import type { HybridObject } from 'react-native-nitro-modules'

export type ScreenOrientationValue =
  | 'unknown'
  | 'portrait'
  | 'portraitUpsideDown'
  | 'landscapeLeft'
  | 'landscapeRight'

export type ScreenOrientationLock =
  | 'portrait'
  | 'portraitUpsideDown'
  | 'landscapeLeft'
  | 'landscapeRight'
  | 'landscape'

export interface OneScreenOrientation extends HybridObject<{ ios: 'swift'; android: 'kotlin' }> {
  getOrientation(): Promise<ScreenOrientationValue>
  lock(orientation: ScreenOrientationLock): Promise<ScreenOrientationValue>
  unlock(): Promise<ScreenOrientationValue>
  addChangeListener(onChange: (orientation: ScreenOrientationValue) => void): () => void
}
