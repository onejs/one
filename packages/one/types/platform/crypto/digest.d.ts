export type DigestSource = (algorithm: string, buffer: ArrayBuffer, offset: number, length: number) => Promise<ArrayBuffer>;
type DigestTarget = {
    crypto?: {
        subtle?: {
            digest?: unknown;
        } | null;
    } | null;
};
export declare function installDigestPolyfill(source: DigestSource, target?: DigestTarget): void;
export {};
//# sourceMappingURL=digest.d.ts.map