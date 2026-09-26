import type { HybridObject } from 'react-native-nitro-modules';
export type LocalBiometryType = 'none' | 'touchID' | 'faceID' | 'opticID';
export interface LocalAuthenticationStatus {
    available: boolean;
    biometryType: LocalBiometryType;
    errorCode?: number;
}
export interface OneLocalAuthentication extends HybridObject<{
    ios: 'swift';
}> {
    canEvaluatePolicy(): LocalAuthenticationStatus;
    evaluatePolicy(reason: string): Promise<boolean>;
}
//# sourceMappingURL=OneLocalAuthentication.nitro.d.ts.map