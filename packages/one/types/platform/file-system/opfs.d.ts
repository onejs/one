import type { FileDirectories, FileEncoding, FileEntry, FileInfo } from '../specs/OneFileSystem.nitro';
export type { FileDirectories, FileEncoding, FileEntry, FileInfo };
export declare const folders: readonly ['documents', 'cache', 'applicationSupport', 'temporary'];
export declare const directories: FileDirectories;
export declare function parts(uri: string): string[];
export declare function root(): Promise<FileSystemDirectoryHandle>;
export declare function parent(names: string[], create?: boolean): Promise<FileSystemDirectoryHandle>;
export declare function entry(names: string[]): Promise<FileSystemFileHandle | FileSystemDirectoryHandle>;
export declare function info(uri: string): Promise<FileInfo>;
export declare function write(handle: FileSystemFileHandle, data: string | Blob | Uint8Array): Promise<void>;
export declare function transfer(fromUri: string, toUri: string, move: boolean): Promise<void>;
export declare function serial<T>(work: () => Promise<T>): Promise<T>;
//# sourceMappingURL=opfs.d.ts.map