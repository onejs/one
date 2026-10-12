import { PathUtilities } from './paths';
import { FileMode } from './types';
import type { DirectoryCreateOptions, DirectoryStat, FileCreateOptions, FileDigestAlgorithm, FileStat, FileWriteOptions, PathInfo, RelocationOptions } from './types';
export type * from './types';
export declare class FileHandle {
    private handleId;
    private mode;
    private closed;
    constructor(handle: number, mode?: FileMode);
    get offset(): number | null;
    set offset(value: number);
    get size(): number | null;
    close(): void;
    readBytes(length: number): Promise<Uint8Array<ArrayBuffer>>;
    readBytesSync(length: number): Uint8Array<ArrayBuffer>;
    writeBytes(bytes: Uint8Array | ArrayBuffer): Promise<void>;
    writeBytesSync(bytes: Uint8Array | ArrayBuffer): void;
    private assertOpen;
}
export declare class File {
    private currentUri;
    constructor(...uris: (string | File | Directory)[]);
    get uri(): string;
    get name(): string;
    get extension(): string;
    get parentDirectory(): Directory;
    get exists(): boolean;
    get size(): number;
    get type(): string;
    get creationTime(): number | null;
    get lastModified(): number | null;
    text(): Promise<string>;
    textSync(): string;
    bytes(): Promise<Uint8Array<ArrayBuffer>>;
    bytesSync(): Uint8Array<ArrayBuffer>;
    base64(): Promise<string>;
    base64Sync(): string;
    arrayBuffer(): Promise<ArrayBuffer>;
    json(): Promise<any>;
    info(): FileStat;
    digest(algorithm: FileDigestAlgorithm): Promise<string>;
    write(content: string | Uint8Array | ArrayBuffer, options?: FileWriteOptions): Promise<void>;
    writeSync(content: string | Uint8Array | ArrayBuffer, options?: FileWriteOptions): void;
    create(options?: FileCreateOptions): void;
    delete(): void;
    copy(destination: File | Directory, options?: RelocationOptions): Promise<void>;
    copySync(destination: File | Directory, options?: RelocationOptions): void;
    move(destination: File | Directory, options?: RelocationOptions): Promise<void>;
    moveSync(destination: File | Directory, options?: RelocationOptions): void;
    rename(newName: string): void;
    open(mode?: FileMode): FileHandle;
    readableStream(): ReadableStream<Uint8Array<ArrayBuffer>>;
    writableStream(): WritableStream<Uint8Array<ArrayBufferLike>>;
    stream(): ReadableStream<Uint8Array<ArrayBuffer>>;
}
export declare class Directory {
    private currentUri;
    constructor(...uris: (string | File | Directory)[]);
    get uri(): string;
    get name(): string;
    get parentDirectory(): Directory;
    get exists(): boolean;
    get size(): number | null;
    list(): (File | Directory)[];
    info(): DirectoryStat;
    create(options?: DirectoryCreateOptions): void;
    createFile(name: string, mimeType: string | null): File;
    createDirectory(name: string): Directory;
    delete(): void;
    copy(destination: File | Directory, options?: RelocationOptions): Promise<void>;
    copySync(destination: File | Directory, options?: RelocationOptions): void;
    move(destination: File | Directory, options?: RelocationOptions): Promise<void>;
    moveSync(destination: File | Directory, options?: RelocationOptions): void;
    rename(newName: string): void;
}
export declare class Paths extends PathUtilities {
    static get cache(): Directory;
    static get document(): Directory;
    static get bundle(): Directory;
    static get totalDiskSpace(): number;
    static get availableDiskSpace(): number;
    static info(...uris: string[]): PathInfo;
}
export { FileMode };
//# sourceMappingURL=classes.native.d.ts.map