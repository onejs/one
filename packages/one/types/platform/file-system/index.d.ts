import type { FileDirectories, FileEncoding, FileEntry, FileInfo } from '../specs/OneFileSystem.nitro';
import { Directory, File, FileHandle, Paths } from './classes';
export type { FileDirectories, FileEncoding, FileEntry, FileInfo };
export type * from './types';
export declare const FileSystem: Readonly<{
    getDirectories: () => FileDirectories;
    getInfo: (uri: string) => Promise<FileInfo>;
    readDirectory: (uri: string) => Promise<FileEntry[]>;
    makeDirectory: (uri: string, intermediates?: boolean) => Promise<void>;
    writeFile: (uri: string, contents: string, encoding?: FileEncoding) => Promise<void>;
    copy: (from: string, to: string) => Promise<void>;
    move: (from: string, to: string) => Promise<void>;
    delete: (uri: string) => Promise<void>;
    File: typeof File;
    Directory: typeof Directory;
    Paths: typeof Paths;
    FileHandle: typeof FileHandle;
    FileMode: Readonly<{
        readonly ReadWrite: 'rw';
        readonly ReadOnly: 'r';
        readonly WriteOnly: 'w';
        readonly Append: 'wa';
        readonly Truncate: 'wt';
    }>;
}>;
//# sourceMappingURL=index.d.ts.map