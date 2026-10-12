import type { DeviceAttestationAvailability } from '../specs/OneDeviceAttestation.nitro';
export type { DeviceAttestationAvailability } from '../specs/OneDeviceAttestation.nitro';
export declare const DeviceAttestation: Readonly<{
    getAvailability: () => DeviceAttestationAvailability;
    generateKey: () => Promise<string>;
    attestKey: (_keyId: string, _clientDataHashBase64: string) => Promise<string>;
    generateAssertion: (_keyId: string, _clientDataHashBase64: string) => Promise<string>;
    generateDeviceToken: () => Promise<string>;
}>;
//# sourceMappingURL=unavailable.d.ts.map