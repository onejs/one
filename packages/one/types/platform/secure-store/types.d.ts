export type SecureStoreAccessibility = 'afterFirstUnlock' | 'afterFirstUnlockThisDeviceOnly' | 'always' | 'alwaysThisDeviceOnly' | 'whenPasscodeSetThisDeviceOnly' | 'whenUnlocked' | 'whenUnlockedThisDeviceOnly';
export interface SecureStoreOptions {
    /**
     * ios: the keychain item's service (kSecAttrService). android: the
     * AndroidKeyStore key alias. an item set with a service is read and
     * deleted with the same service.
     */
    keychainService?: string;
    /** ios only: when the item is accessible (kSecAttrAccessible). default 'whenUnlocked' */
    keychainAccessible?: SecureStoreAccessibility;
    /**
     * require biometric authentication to read or write the item. ios uses a
     * biometryCurrentSet access control; android uses a user-authentication
     * bound AndroidKeyStore key, invalidated when biometrics change. on
     * android the prompt needs a foreground activity, so the sync verbs throw
     * for an authenticated item instead of prompting.
     */
    requireAuthentication?: boolean;
    /** message shown while requireAuthentication prompts */
    authenticationPrompt?: string;
    /** ios only: the keychain access group the item belongs to */
    accessGroup?: string;
}
//# sourceMappingURL=types.d.ts.map