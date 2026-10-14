import type { SecureStoreAccessibility, SecureStoreOptions } from './types';
export declare function assertSecureStoreKey(key: unknown, verb: string): asserts key is string;
export declare function assertSecureStoreValue(value: unknown, verb: string): asserts value is string;
export declare const SECURE_STORE_ACCESSIBILITIES: readonly SecureStoreAccessibility[];
export declare function assertSecureStoreOptions(options: SecureStoreOptions | undefined, verb: string): SecureStoreOptions;
//# sourceMappingURL=validate.d.ts.map