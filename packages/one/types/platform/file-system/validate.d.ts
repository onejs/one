import { FileMode, type FileDigestAlgorithm } from './types';
import type { FileEncoding } from '../specs/OneFileSystem.nitro';
export declare function assertUri(uri: unknown, owner: string): asserts uri is string;
export declare function assertMode(mode: unknown, owner: string): asserts mode is FileMode;
export declare function assertEncoding(encoding: unknown, owner: string): asserts encoding is FileEncoding;
export declare function assertAlgorithm(algorithm: unknown, owner: string): asserts algorithm is FileDigestAlgorithm;
export declare function assertByteLength(length: unknown, owner: string): asserts length is number;
export declare function assertOffset(offset: unknown, owner: string): asserts offset is number;
export declare function assertName(name: unknown, owner: string): asserts name is string;
export declare function assertWriteContent(content: unknown, owner: string): asserts content is string | Uint8Array | ArrayBuffer;
export declare function assertWriteBytes(bytes: unknown, owner: string): asserts bytes is Uint8Array | ArrayBuffer;
export declare function assertReadable(mode: FileMode, verb: string): void;
export declare function assertWritable(mode: FileMode, verb: string): void;
export declare function assertDestination(destination: unknown, owner: string): asserts destination is {
    uri: string;
};
//# sourceMappingURL=validate.d.ts.map