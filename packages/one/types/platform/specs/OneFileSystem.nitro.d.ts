import type { HybridObject } from 'react-native-nitro-modules';
export type FileEncoding = 'utf8' | 'base64';
export interface FileDirectories {
    documents: string;
    cache: string;
    applicationSupport: string;
    temporary: string;
}
export interface FileInfo {
    uri: string;
    exists: boolean;
    isDirectory: boolean;
    size?: number;
    modifiedAt?: number;
}
export interface FileEntry {
    name: string;
    uri: string;
    isDirectory: boolean;
}
export interface DiskSpace {
    available: number;
    total: number;
}
export interface PathStat {
    exists: boolean;
    isDirectory?: boolean;
}
export interface ListedEntry {
    name: string;
    uri: string;
    isDirectory: boolean;
}
export interface DetailedFileInfo {
    exists: boolean;
    size: number;
    modificationTime?: number;
    creationTime?: number;
    mimeType: string;
}
export interface DetailedDirectoryInfo {
    exists: boolean;
    size?: number;
    modificationTime?: number;
    creationTime?: number;
    files?: string[];
}
export interface OneFileSystem extends HybridObject<{
    ios: 'swift';
    android: 'kotlin';
}> {
    getDirectories(): FileDirectories;
    getInfo(uri: string): Promise<FileInfo>;
    readDirectory(uri: string): Promise<FileEntry[]>;
    makeDirectory(uri: string, intermediates: boolean): Promise<void>;
    writeFile(uri: string, contents: string, encoding: FileEncoding): Promise<void>;
    copy(fromUri: string, toUri: string): Promise<void>;
    move(fromUri: string, toUri: string): Promise<void>;
    remove(uri: string): Promise<void>;
    getBundleDirectory(): string;
    getDiskSpace(): DiskSpace;
    pathInfo(uri: string): PathStat;
    readText(uri: string): string;
    readTextAsync(uri: string): Promise<string>;
    readData(uri: string): ArrayBuffer;
    readDataAsync(uri: string): Promise<ArrayBuffer>;
    readBase64(uri: string): string;
    readBase64Async(uri: string): Promise<string>;
    writeText(uri: string, contents: string, encoding: FileEncoding, append: boolean): void;
    writeTextAsync(uri: string, contents: string, encoding: FileEncoding, append: boolean): Promise<void>;
    writeData(uri: string, bytes: ArrayBuffer, append: boolean): void;
    writeDataAsync(uri: string, bytes: ArrayBuffer, append: boolean): Promise<void>;
    fileDigest(uri: string, algorithm: string): Promise<string>;
    createFileEntry(uri: string, intermediates: boolean, overwrite: boolean): void;
    createDirectoryEntry(uri: string, intermediates: boolean, overwrite: boolean, idempotent: boolean): void;
    createFileInDirectory(dirUri: string, name: string): string;
    createSubdirectory(dirUri: string, name: string): string;
    deleteEntry(uri: string): void;
    renameEntry(uri: string, newName: string): string;
    copyEntry(fromUri: string, toUri: string, overwrite: boolean): void;
    copyEntryAsync(fromUri: string, toUri: string, overwrite: boolean): Promise<void>;
    moveEntry(fromUri: string, toUri: string, overwrite: boolean): void;
    moveEntryAsync(fromUri: string, toUri: string, overwrite: boolean): Promise<void>;
    listEntries(uri: string): ListedEntry[];
    fileDetails(uri: string): DetailedFileInfo;
    directoryDetails(uri: string): DetailedDirectoryInfo;
    openFile(uri: string, mode: string): number;
    closeFile(handle: number): void;
    readHandle(handle: number, length: number): ArrayBuffer;
    readHandleAsync(handle: number, length: number): Promise<ArrayBuffer>;
    writeHandle(handle: number, bytes: ArrayBuffer): void;
    writeHandleAsync(handle: number, bytes: ArrayBuffer): Promise<void>;
    getHandleOffset(handle: number): number;
    setHandleOffset(handle: number, offset: number): void;
    getHandleSize(handle: number): number;
}
//# sourceMappingURL=OneFileSystem.nitro.d.ts.map