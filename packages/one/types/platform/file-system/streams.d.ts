export type StreamHandle = {
    readBytes(length: number): Promise<Uint8Array<ArrayBuffer>>;
    writeBytes(chunk: Uint8Array): Promise<void>;
    close(): void;
};
export declare class FileSystemReadableStreamSource implements UnderlyingByteSource {
    handle: StreamHandle;
    size: number;
    type: 'bytes';
    constructor(handle: StreamHandle);
    cancel(): void;
    pull(controller: ReadableByteStreamController): Promise<void>;
}
export declare class FileSystemWritableSink implements UnderlyingSink<Uint8Array> {
    handle: StreamHandle;
    constructor(handle: StreamHandle);
    abort(): void;
    close(): void;
    write(chunk: Uint8Array): Promise<void>;
}
//# sourceMappingURL=streams.d.ts.map