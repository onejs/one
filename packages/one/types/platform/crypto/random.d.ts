export declare const MAX_RANDOM_BYTES = 65536;
export type RandomSource = {
    fill(bytes: Uint8Array<ArrayBuffer>): void;
    randomUUID(): string;
};
export declare function formatUuidV4(bytes: Uint8Array): string;
export declare function fillRandomValues<T extends ArrayBufferView>(view: T, source: RandomSource): T;
export type CryptoPolyfillTarget = {
    crypto?: {
        getRandomValues?: unknown;
        randomUUID?: unknown;
    } | null;
};
export declare function installCryptoPolyfill(source: RandomSource, target?: CryptoPolyfillTarget): void;
//# sourceMappingURL=random.d.ts.map