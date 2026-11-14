import { type DigestSource } from './digest.js';
import type { DigestAlgorithm, DigestStringOptions } from './types.js';
export declare const DIGEST_ALGORITHMS: readonly DigestAlgorithm[];
export declare function assertDigestAlgorithm(algorithm: DigestAlgorithm, verb: string): void;
export declare function createDigestApi(source: DigestSource): {
    digest: (algorithm: DigestAlgorithm, data: BufferSource) => Promise<ArrayBuffer>;
    digestString: (algorithm: DigestAlgorithm, data: string, options?: DigestStringOptions) => Promise<string>;
};
//# sourceMappingURL=digest-api.d.ts.map