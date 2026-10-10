import type { FileDirectories, FileEncoding, FileEntry, FileInfo } from '../specs/OneFileSystem.nitro';
export type { FileDirectories, FileEncoding, FileEntry, FileInfo };
export declare const FileSystem: Readonly<{
    getDirectories: () => FileDirectories;
    getInfo: (uri: string) => Promise<FileInfo>;
    readDirectory: (uri: string) => Promise<FileEntry[]>;
    makeDirectory: (uri: string, intermediates?: boolean) => Promise<void>;
    writeFile: (uri: string, contents: string, encoding?: FileEncoding) => Promise<void>;
    copy: (from: string, to: string) => Promise<void>;
    move: (from: string, to: string) => Promise<void>;
    delete: (uri: string) => Promise<void>;
}>;
//# sourceMappingURL=index.d.ts.map