export declare const MAX_RANDOM_BYTES = 65536;
export type RandomBytesSource = (count: number) => Uint8Array;
export declare function assertByteCount(count: number): void;
export declare function decodeHexBytes(hex: string, expectedLength: number): Uint8Array;
export declare function formatUuidV4(bytes: Uint8Array): string;
export declare function fillRandomValues<T extends ArrayBufferView>(view: T, source: RandomBytesSource): T;
export type CryptoPolyfillTarget = {
    crypto?: {
        getRandomValues?: unknown;
        randomUUID?: unknown;
    } | null;
};
export declare function installCryptoPolyfill(source: RandomBytesSource, target?: CryptoPolyfillTarget): void;
//# sourceMappingURL=random.d.ts.map