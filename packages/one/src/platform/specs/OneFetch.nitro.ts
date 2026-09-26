import type { HybridObject } from 'react-native-nitro-modules'

export interface FetchHeader {
  name: string
  value: string
}

// a react native Blob: bytes held in the native blob store
export interface FetchBlobRef {
  blobId: string
  offset: number
  size: number
}

// one FormData entry; exactly one of value, uri or blob is set
export interface FetchFormPart {
  name: string
  value?: string
  uri?: string
  blob?: FetchBlobRef
  filename?: string
  type?: string
}

export interface FetchNativeRequest {
  url: string
  method: string
  headers: FetchHeader[]
  // at most one body source
  body?: ArrayBuffer
  blob?: FetchBlobRef
  form?: FetchFormPart[]
  // multipart boundary, set with form; the js side already wrote it into
  // the content-type header
  boundary?: string
  // credentials: 'omit' sends and stores no cookies
  omitCredentials: boolean
}

export interface FetchNativeResponse {
  status: number
  statusText: string
  url: string
  redirected: boolean
  headers: FetchHeader[]
}

// the global fetch on native. one request streamed back as it arrives: the
// response head, then each chunk of the body as the platform reads it, then
// exactly one of complete or error. cancel ends a request silently; the js
// side already settled it. http(s) goes through the same URLSession cookie
// storage / OkHttp client react native networking uses; file: and content:
// urls are read from disk.
export interface OneFetch extends HybridObject<{ ios: 'swift'; android: 'kotlin' }> {
  start(
    id: number,
    request: FetchNativeRequest,
    onResponse: (response: FetchNativeResponse) => void,
    onChunk: (chunk: ArrayBuffer) => void,
    onComplete: () => void,
    onError: (message: string) => void
  ): void
  cancel(id: number): void
  // copies bytes into react native's blob store for Response.blob() and
  // returns the blob id
  storeBlob(bytes: ArrayBuffer): string
}
