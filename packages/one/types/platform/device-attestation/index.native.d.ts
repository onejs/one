import type { DeviceAttestationAvailability } from '../specs/OneDeviceAttestation.nitro';
export type { DeviceAttestationAvailability } from '../specs/OneDeviceAttestation.nitro';
declare function getAvailability(): DeviceAttestationAvailability;
declare function generateKey(): Promise<string>;
declare function attestKey(keyId: string, clientDataHashBase64: string): Promise<string>;
declare function generateAssertion(keyId: string, clientDataHashBase64: string): Promise<string>;
declare function generateDeviceToken(): Promise<string>;
export declare const DeviceAttestation: Readonly<{
    getAvailability: typeof getAvailability;
    generateKey: typeof generateKey;
    attestKey: typeof attestKey;
    generateAssertion: typeof generateAssertion;
    generateDeviceToken: typeof generateDeviceToken;
}>;
//# sourceMappingURL=index.native.d.ts.map