import { PathUtilities } from './paths';
import { FileMode } from './types';
import type { DirectoryCreateOptions, DirectoryStat, FileCreateOptions, FileDigestAlgorithm, FileStat, FileWriteOptions, PathInfo, RelocationOptions } from './types';
export type * from './types';
export declare class FileHandle {
    private targetUri;
    private mode;
    private offsetValue;
    private closed;
    private truncatePending;
    private appendPending;
    constructor(uri: string, mode?: FileMode);
    get offset(): number | null;
    set offset(value: number);
    get size(): number | null;
    close(): void;
    readBytes(length: number): Promise<Uint8Array<ArrayBuffer>>;
    readBytesSync(_length: number): Uint8Array<ArrayBuffer>;
    writeBytes(bytes: Uint8Array | ArrayBuffer): Promise<void>;
    writeBytesSync(_bytes: Uint8Array | ArrayBuffer): void;
    private prepare;
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
    writeSync(_content: string | Uint8Array | ArrayBuffer, _options?: FileWriteOptions): void;
    create(_options?: FileCreateOptions): void;
    delete(): void;
    copy(destination: File | Directory, options?: RelocationOptions): Promise<void>;
    copySync(_destination: File | Directory, _options?: RelocationOptions): void;
    move(destination: File | Directory, options?: RelocationOptions): Promise<void>;
    moveSync(_destination: File | Directory, _options?: RelocationOptions): void;
    rename(_newName: string): void;
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
    create(_options?: DirectoryCreateOptions): void;
    createFile(_name: string, _mimeType: string | null): File;
    createDirectory(_name: string): Directory;
    delete(): void;
    copy(destination: File | Directory, options?: RelocationOptions): Promise<void>;
    copySync(_destination: File | Directory, _options?: RelocationOptions): void;
    move(destination: File | Directory, options?: RelocationOptions): Promise<void>;
    moveSync(_destination: File | Directory, _options?: RelocationOptions): void;
    rename(_newName: string): void;
}
export declare class Paths extends PathUtilities {
    static get cache(): Directory;
    static get document(): Directory;
    static get bundle(): Directory;
    static get totalDiskSpace(): number;
    static get availableDiskSpace(): number;
    static info(..._uris: string[]): PathInfo;
}
export { FileMode };
//# sourceMappingURL=classes.d.ts.map