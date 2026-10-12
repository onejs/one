import type { HybridObject } from 'react-native-nitro-modules'

export interface OneKeepAwake extends HybridObject<{ ios: 'swift'; android: 'kotlin' }> {
  isEnabled(): Promise<boolean>
  setEnabled(enabled: boolean): Promise<void>
}
