import type { FileDirectories, FileEncoding, FileEntry, FileInfo } from '../specs/OneFileSystem.nitro';
import { Directory, File, FileHandle, Paths } from './classes.native';
export type { FileDirectories, FileEncoding, FileEntry, FileInfo };
export type * from './types';
declare function getDirectories(): FileDirectories;
declare function getInfo(uri: string): Promise<FileInfo>;
declare function readDirectory(uri: string): Promise<FileEntry[]>;
declare function makeDirectory(uri: string, intermediates?: boolean): Promise<void>;
declare function writeFile(uri: string, contents: string, encoding?: FileEncoding): Promise<void>;
declare function copy(fromUri: string, toUri: string): Promise<void>;
declare function move(fromUri: string, toUri: string): Promise<void>;
declare function deleteFile(uri: string): Promise<void>;
export declare const FileSystem: Readonly<{
    getDirectories: typeof getDirectories;
    getInfo: typeof getInfo;
    readDirectory: typeof readDirectory;
    makeDirectory: typeof makeDirectory;
    writeFile: typeof writeFile;
    copy: typeof copy;
    move: typeof move;
    delete: typeof deleteFile;
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
//# sourceMappingURL=index.native.d.ts.map