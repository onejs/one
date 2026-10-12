import type { HybridObject } from 'react-native-nitro-modules';
export interface DeviceAttestationAvailability {
    appAttest: boolean;
    deviceCheck: boolean;
}
export interface OneDeviceAttestation extends HybridObject<{
    ios: 'swift';
}> {
    getAvailability(): DeviceAttestationAvailability;
    generateKey(): Promise<string>;
    attestKey(keyId: string, clientDataHashBase64: string): Promise<string>;
    generateAssertion(keyId: string, clientDataHashBase64: string): Promise<string>;
    generateDeviceToken(): Promise<string>;
}
//# sourceMappingURL=OneDeviceAttestation.nitro.d.ts.map