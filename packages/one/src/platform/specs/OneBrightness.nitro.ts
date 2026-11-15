import type { HybridObject } from 'react-native-nitro-modules'
import type {
  BrightnessEvent,
  BrightnessMode,
  BrightnessPermissionResponse,
} from '../brightness/types'

// screen brightness behind One.Brightness, matching expo-brightness: app
// brightness on both platforms, system brightness and mode on android only.
// isAvailable is synchronous. app brightness needs no permission; system
// writes need the android write-settings grant.
export interface OneBrightness extends HybridObject<{ android: 'kotlin' }> {
  get(): Promise<number>
  set(value: number): Promise<void>
  getSystem(): Promise<number>
  setSystem(value: number): Promise<void>
  getSystemMode(): Promise<BrightnessMode>
  setSystemMode(mode: BrightnessMode): Promise<void>
  isUsingSystem(): Promise<boolean>
  restoreSystem(): Promise<void>
  getPermissions(): Promise<BrightnessPermissionResponse>
  requestPermissions(): Promise<BrightnessPermissionResponse>
  isAvailable(): boolean
  addListener(listener: (event: BrightnessEvent) => void): () => void
}
