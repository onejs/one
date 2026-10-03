import type { HybridObject } from 'react-native-nitro-modules'

export interface OneNativeModules extends HybridObject<{ ios: 'swift'; android: 'kotlin' }> {
  call(module: string, methodName: string, argsJson: string, contractHash: string): Promise<string>
}
