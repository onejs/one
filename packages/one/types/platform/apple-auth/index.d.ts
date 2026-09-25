import type { ReactNode } from 'react';
import { AppleAuthenticationButtonStyle, AppleAuthenticationButtonType, AppleAuthenticationCredentialState, AppleAuthenticationScope, AppleAuthenticationUserDetectionStatus, type AppleAuthenticationButtonProps, type AppleAuthenticationCredential, type AppleAuthenticationSignInOptions } from './types';
export * from './types';
export declare function isAvailableAsync(): Promise<boolean>;
export declare function signInAsync(_options?: AppleAuthenticationSignInOptions): Promise<AppleAuthenticationCredential>;
export declare function getCredentialStateAsync(_user: string): Promise<AppleAuthenticationCredentialState>;
export declare function AppleAuthenticationButton(_props: AppleAuthenticationButtonProps): ReactNode;
export declare const AppleAuth: Readonly<{
    isAvailable: false;
    isAvailableAsync: typeof isAvailableAsync;
    signInAsync: typeof signInAsync;
    getCredentialStateAsync: typeof getCredentialStateAsync;
    AppleAuthenticationButton: typeof AppleAuthenticationButton;
    AppleAuthenticationButtonType: typeof AppleAuthenticationButtonType;
    AppleAuthenticationButtonStyle: typeof AppleAuthenticationButtonStyle;
    AppleAuthenticationScope: typeof AppleAuthenticationScope;
    AppleAuthenticationCredentialState: typeof AppleAuthenticationCredentialState;
    AppleAuthenticationUserDetectionStatus: typeof AppleAuthenticationUserDetectionStatus;
}>;
//# sourceMappingURL=index.d.ts.map