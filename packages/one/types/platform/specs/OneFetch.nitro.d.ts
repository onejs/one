import type { HybridObject } from 'react-native-nitro-modules';
export interface FetchHeader {
    name: string;
    value: string;
}
export interface FetchBlobRef {
    blobId: string;
    offset: number;
    size: number;
}
export interface FetchFormPart {
    name: string;
    value?: string;
    uri?: string;
    blob?: FetchBlobRef;
    filename?: string;
    type?: string;
}
export interface FetchNativeRequest {
    url: string;
    method: string;
    headers: FetchHeader[];
    body?: ArrayBuffer;
    blob?: FetchBlobRef;
    form?: FetchFormPart[];
    boundary?: string;
    omitCredentials: boolean;
}
export interface FetchNativeResponse {
    status: number;
    statusText: string;
    url: string;
    redirected: boolean;
    headers: FetchHeader[];
}
export interface OneFetch extends HybridObject<{
    ios: 'swift';
    android: 'kotlin';
}> {
    start(id: number, request: FetchNativeRequest, onResponse: (response: FetchNativeResponse) => void, onChunk: (chunk: ArrayBuffer) => void, onComplete: () => void, onError: (message: string) => void): void;
    cancel(id: number): void;
    storeBlob(bytes: ArrayBuffer): string;
}
//# sourceMappingURL=OneFetch.nitro.d.ts.map