import type { HybridObject } from 'react-native-nitro-modules';
export type AppleAuthScope = 'fullName' | 'email';
export type AppleCredentialState = 'revoked' | 'authorized' | 'notFound' | 'transferred';
export type AppleRealUserStatus = 'unsupported' | 'unknown' | 'likelyReal';
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
    realUserStatus: AppleRealUserStatus;
}
export type AppleAuthResultType = 'success' | 'cancel';
export interface AppleAuthResult {
    type: AppleAuthResultType;
    credential?: AppleAuthCredential;
}
export interface AppleAuthSignInOptions {
    requestedScopes?: AppleAuthScope[];
    nonce?: string;
    state?: string;
}
export interface OneAppleAuth extends HybridObject<{
    ios: 'swift';
    android: 'kotlin';
}> {
    isAvailable(): boolean;
    signIn(options: AppleAuthSignInOptions): Promise<AppleAuthResult>;
    getCredentialState(user: string): Promise<AppleCredentialState>;
}
//# sourceMappingURL=OneAppleAuth.nitro.d.ts.map