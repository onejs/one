import type { DeviceAttestationAvailability } from '../specs/OneDeviceAttestation.nitro';
export type { DeviceAttestationAvailability } from '../specs/OneDeviceAttestation.nitro';
declare function getAvailability(): DeviceAttestationAvailability;
declare function generateKey(): Promise<string>;
declare function attestKey(keyId: string, clientDataHashBase64: string): Promise<string>;
declare function generateAssertion(keyId: string, clientDataHashBase64: string): Promise<string>;
declare function generateDeviceToken(): Promise<string>;
declare const nativeDeviceAttestation: Readonly<{
    getAvailability: typeof getAvailability;
    generateKey: typeof generateKey;
    attestKey: typeof attestKey;
    generateAssertion: typeof generateAssertion;
    generateDeviceToken: typeof generateDeviceToken;
}>;
export declare const DeviceAttestation: typeof nativeDeviceAttestation;
//# sourceMappingURL=index.native.d.ts.map