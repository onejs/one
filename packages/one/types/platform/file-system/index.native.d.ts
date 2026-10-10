import type { FileDirectories, FileEncoding, FileEntry, FileInfo } from '../specs/OneFileSystem.nitro';
export type { FileDirectories, FileEncoding, FileEntry, FileInfo };
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
}>;
//# sourceMappingURL=index.native.d.ts.map