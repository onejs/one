import type {
  ReadableStream as PolyfillReadableStream,
  WritableStream as PolyfillWritableStream,
} from 'web-streams-polyfill'

export type ReadableStream<R = any> = PolyfillReadableStream<R> &
  (typeof globalThis extends { ReadableStream: { prototype: infer Stream } }
    ? Stream
    : unknown)

export type WritableStream<W = any> = PolyfillWritableStream<W> &
  (typeof globalThis extends { WritableStream: { prototype: infer Stream } }
    ? Stream
    : unknown)
