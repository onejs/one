export declare function deviceAttestationNative(): {
    getAvailability(): {
        appAttest: boolean;
        deviceCheck: boolean;
    };
    generateKey(): Promise<string>;
    attestKey(keyId: string, clientDataHashBase64: string): Promise<string>;
    generateAssertion(keyId: string, clientDataHashBase64: string): Promise<string>;
    generateDeviceToken(): Promise<string>;
};
//# sourceMappingURL=backend.ios.d.ts.map