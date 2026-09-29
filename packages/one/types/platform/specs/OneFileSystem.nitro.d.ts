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
export interface OneFileSystem extends HybridObject<{
    ios: 'swift';
}> {
    getDirectories(): FileDirectories;
    getInfo(uri: string): Promise<FileInfo>;
    readDirectory(uri: string): Promise<FileEntry[]>;
    makeDirectory(uri: string, intermediates: boolean): Promise<void>;
    writeFile(uri: string, contents: string, encoding: FileEncoding): Promise<void>;
    copy(fromUri: string, toUri: string): Promise<void>;
    move(fromUri: string, toUri: string): Promise<void>;
    remove(uri: string): Promise<void>;
}
//# sourceMappingURL=OneFileSystem.nitro.d.ts.map