import { AppleAuthenticationButtonStyle, AppleAuthenticationButtonType, AppleAuthenticationCredentialState, AppleAuthenticationScope, AppleAuthenticationUserDetectionStatus, type AppleAuthenticationButtonProps, type AppleAuthenticationCredential, type AppleAuthenticationSignInOptions } from './types';
export * from './types';
export declare function isAvailableAsync(): Promise<boolean>;
export declare function signInAsync(options?: AppleAuthenticationSignInOptions): Promise<AppleAuthenticationCredential>;
export declare function getCredentialStateAsync(user: string): Promise<AppleAuthenticationCredentialState>;
export declare function AppleAuthenticationButton({ buttonType, buttonStyle, cornerRadius, style, onPress, ...rest }: AppleAuthenticationButtonProps): import("react/jsx-runtime").JSX.Element | null;
export declare const AppleAuth: Readonly<{
    readonly isAvailable: boolean;
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
//# sourceMappingURL=index.native.d.ts.map