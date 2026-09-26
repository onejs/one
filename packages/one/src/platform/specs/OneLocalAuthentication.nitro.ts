import type { HybridObject } from 'react-native-nitro-modules'

export type LocalBiometryType = 'none' | 'touchID' | 'faceID' | 'opticID'

export interface LocalAuthenticationStatus {
  available: boolean
  biometryType: LocalBiometryType
  errorCode?: number
}

// the biometric policy of LocalAuthentication. a successful evaluation
// resolves true; a user cancellation resolves false; other failures reject.
export interface OneLocalAuthentication extends HybridObject<{ ios: 'swift' }> {
  canEvaluatePolicy(): LocalAuthenticationStatus
  evaluatePolicy(reason: string): Promise<boolean>
}
