import { fillRandomValues, formatUuidV4, installCryptoPolyfill, MAX_RANDOM_BYTES, type RandomBytesSource } from './random';
export { fillRandomValues, formatUuidV4, installCryptoPolyfill, MAX_RANDOM_BYTES, };
export type { RandomBytesSource };
export declare function isSecureRandomAvailable(): boolean;
export declare function getSecureRandomBytes(count: number): Uint8Array;
export declare function installCrypto(): void;
//# sourceMappingURL=index.native.d.ts.map