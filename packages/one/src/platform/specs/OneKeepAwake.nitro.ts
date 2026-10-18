import type { HybridObject } from 'react-native-nitro-modules'

export interface OneKeepAwake extends HybridObject<{ android: 'kotlin' }> {
  isEnabled(): Promise<boolean>
  setEnabled(enabled: boolean): Promise<void>
  activate(tag: string): Promise<void>
  deactivate(tag: string): Promise<void>
}
