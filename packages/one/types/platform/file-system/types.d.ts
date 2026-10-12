import type { FileEncoding } from '../specs/OneFileSystem.nitro';
export declare const FileMode: Readonly<{
    readonly ReadWrite: 'rw';
    readonly ReadOnly: 'r';
    readonly WriteOnly: 'w';
    readonly Append: 'wa';
    readonly Truncate: 'wt';
}>;
export type FileMode = (typeof FileMode)[keyof typeof FileMode];
export type FileCreateOptions = {
    intermediates?: boolean;
    overwrite?: boolean;
};
export type DirectoryCreateOptions = {
    intermediates?: boolean;
    overwrite?: boolean;
    idempotent?: boolean;
};
export type RelocationOptions = {
    overwrite?: boolean;
};
export type FileWriteOptions = {
    encoding?: FileEncoding;
    append?: boolean;
};
export type FileDigestAlgorithm = 'MD5' | 'SHA-1' | 'SHA-256' | 'SHA-384' | 'SHA-512';
export type FileStat = {
    exists: boolean;
    uri?: string;
    size?: number;
    modificationTime?: number;
    creationTime?: number;
};
export type DirectoryStat = {
    exists: boolean;
    uri?: string;
    size?: number;
    modificationTime?: number;
    creationTime?: number;
    files?: string[];
};
export type PathInfo = {
    exists: boolean;
    isDirectory: boolean | null;
};
export type ParsedPath = {
    root: string;
    dir: string;
    base: string;
    ext: string;
    name: string;
};
//# sourceMappingURL=types.d.ts.map