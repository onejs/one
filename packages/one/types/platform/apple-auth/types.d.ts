import type { StyleProp, ViewProps, ViewStyle } from 'react-native';
export declare enum AppleAuthenticationScope {
    FULL_NAME = 0,
    EMAIL = 1
}
export declare enum AppleAuthenticationOperation {
    IMPLICIT = 0,
    LOGIN = 1,
    REFRESH = 2,
    LOGOUT = 3
}
export declare enum AppleAuthenticationCredentialState {
    REVOKED = 0,
    AUTHORIZED = 1,
    NOT_FOUND = 2,
    TRANSFERRED = 3
}
export declare enum AppleAuthenticationUserDetectionStatus {
    UNSUPPORTED = 0,
    UNKNOWN = 1,
    LIKELY_REAL = 2
}
export declare enum AppleAuthenticationButtonType {
    SIGN_IN = 0,
    CONTINUE = 1,
    SIGN_UP = 2
}
export declare enum AppleAuthenticationButtonStyle {
    WHITE = 0,
    WHITE_OUTLINE = 1,
    BLACK = 2
}
export interface AppleAuthenticationFullName {
    namePrefix: string | null;
    givenName: string | null;
    middleName: string | null;
    familyName: string | null;
    nameSuffix: string | null;
    nickname: string | null;
}
export interface AppleAuthenticationCredential {
    user: string;
    state: string | null;
    fullName: AppleAuthenticationFullName | null;
    email: string | null;
    realUserStatus: AppleAuthenticationUserDetectionStatus;
    identityToken: string | null;
    authorizationCode: string | null;
}
export interface AppleAuthenticationSignInOptions {
    requestedScopes?: (AppleAuthenticationScope | 'fullName' | 'email')[];
    state?: string;
    nonce?: string;
}
export interface AppleAuthenticationButtonProps extends ViewProps {
    onPress: () => void;
    buttonType?: AppleAuthenticationButtonType;
    buttonStyle?: AppleAuthenticationButtonStyle;
    cornerRadius?: number;
    style?: StyleProp<ViewStyle>;
}
//# sourceMappingURL=types.d.ts.map