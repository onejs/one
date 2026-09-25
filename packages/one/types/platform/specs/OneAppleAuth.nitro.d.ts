import type { HybridObject } from 'react-native-nitro-modules';
export interface AppleAuthFullName {
    namePrefix?: string;
    givenName?: string;
    middleName?: string;
    familyName?: string;
    nameSuffix?: string;
    nickname?: string;
}
export interface AppleAuthCredential {
    user: string;
    state?: string;
    identityToken?: string;
    authorizationCode?: string;
    email?: string;
    fullName?: AppleAuthFullName;
    realUserStatus: number;
}
export interface AppleAuthSignInOptions {
    requestedScopes?: string[];
    nonce?: string;
    state?: string;
}
export interface OneAppleAuth extends HybridObject<{
    ios: 'swift';
    android: 'kotlin';
}> {
    isAvailable(): boolean;
    signIn(options: AppleAuthSignInOptions): Promise<AppleAuthCredential>;
    getCredentialState(user: string): Promise<number>;
}
//# sourceMappingURL=OneAppleAuth.nitro.d.ts.map