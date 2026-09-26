import type { FileDirectories, FileEncoding, FileEntry, FileInfo } from '../specs/OneFileSystem.nitro';
export type { FileDirectories, FileEncoding, FileEntry, FileInfo };
export declare const FileSystem: Readonly<{
    getDirectories: () => FileDirectories;
    getInfo: (_uri: string) => Promise<FileInfo>;
    readDirectory: (_uri: string) => Promise<FileEntry[]>;
    makeDirectory: (_uri: string, _intermediates?: boolean) => Promise<void>;
    writeFile: (_uri: string, _contents: string, _encoding?: FileEncoding) => Promise<void>;
    copy: (_fromUri: string, _toUri: string) => Promise<void>;
    move: (_fromUri: string, _toUri: string) => Promise<void>;
    delete: (_uri: string) => Promise<void>;
}>;
//# sourceMappingURL=index.d.ts.map