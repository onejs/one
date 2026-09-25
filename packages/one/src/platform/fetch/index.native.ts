// @ts-ignore react native ships no types for its blob manager
import BlobManagerModule from 'react-native/Libraries/Blob/BlobManager'
import { NativeModules, Platform } from 'react-native'
import { NitroModules } from 'react-native-nitro-modules'
import type {
  FetchBlobRef,
  FetchFormPart,
  FetchHeader,
  FetchNativeRequest,
  FetchNativeResponse,
  OneFetch,
} from '../specs/OneFetch.nitro'

// react native's fetch runs over XMLHttpRequest and buffers the whole
// response before resolving, so response.body does not exist and streamed
// responses (ndjson, server-sent events, model output) arrive all at once.
// this fetch runs each request on URLSession / OkHttp and hands every chunk to
// response.body as it lands, and replaces the global so libraries that stream
// (ai sdks) work unchanged. it keeps what react native's fetch accepts:
// string, URLSearchParams, ArrayBuffer, typed array, Blob and FormData bodies
// (including { uri, name, type } file parts), file: and content: urls, and
// Request inputs.
let hybrid: OneFetch | undefined

// wraps a blob id from the native store in a Blob that releases it on gc
const BlobManager: {
  createFromOptions(options: {
    blobId: string
    offset: number
    size: number
    type: string
    lastModified: number
  }): Blob
} = BlobManagerModule

function native(): OneFetch {
  hybrid ??= NitroModules.createHybridObject<OneFetch>('OneFetch')
  return hybrid
}

let lastId = 0

type NativeBody = Pick<FetchNativeRequest, 'body' | 'blob' | 'form' | 'boundary'>

function bufferOf(view: ArrayBufferView): ArrayBuffer {
  const { buffer, byteOffset, byteLength } = view
  if (!(buffer instanceof ArrayBuffer)) {
    throw new TypeError('fetch: a body backed by a SharedArrayBuffer is not supported')
  }
  return buffer.slice(byteOffset, byteOffset + byteLength)
}

function blobRef(blob: Blob): FetchBlobRef {
  const data: unknown = Reflect.get(blob, 'data')
  if (
    typeof data !== 'object' ||
    data === null ||
    !('blobId' in data) ||
    typeof data.blobId !== 'string' ||
    !('offset' in data) ||
    typeof data.offset !== 'number'
  ) {
    throw new TypeError('fetch: the Blob body is not a React Native blob')
  }
  return { blobId: data.blobId, offset: data.offset, size: blob.size }
}

function formParts(form: FormData): FetchFormPart[] {
  const entries: unknown = Reflect.get(form, '_parts')
  if (!Array.isArray(entries)) {
    throw new TypeError('fetch: the FormData body is not a React Native FormData')
  }
  return entries.map((entry): FetchFormPart => {
    const [name, value]: unknown[] = entry
    if (typeof name !== 'string') throw new TypeError('fetch: a FormData name must be a string')
    if (value instanceof Blob) {
      const filename: unknown = Reflect.get(value, 'name')
      return {
        name,
        blob: blobRef(value),
        filename: typeof filename === 'string' ? filename : 'blob',
        type: value.type || 'application/octet-stream',
      }
    }
    if (typeof value === 'object' && value !== null && 'uri' in value) {
      if (typeof value.uri !== 'string') throw new TypeError('fetch: a FormData uri must be a string')
      const filename = 'name' in value && typeof value.name === 'string' ? value.name : undefined
      const type = 'type' in value && typeof value.type === 'string' ? value.type : undefined
      return { name, uri: value.uri, filename, type }
    }
    return { name, value: String(value) }
  })
}

// the body as native sends it, plus the content-type it implies
function encode(body: unknown): { native: NativeBody; type?: string; forceType?: boolean } {
  if (typeof body === 'string') {
    return {
      native: { body: bufferOf(new TextEncoder().encode(body)) },
      type: 'text/plain;charset=UTF-8',
    }
  }
  if (body instanceof URLSearchParams) {
    return {
      native: { body: bufferOf(new TextEncoder().encode(body.toString())) },
      type: 'application/x-www-form-urlencoded;charset=UTF-8',
    }
  }
  if (body instanceof ArrayBuffer) return { native: { body: body.slice(0) } }
  if (ArrayBuffer.isView(body)) return { native: { body: bufferOf(body) } }
  if (body instanceof Blob) {
    return { native: { blob: blobRef(body) }, type: body.type || undefined }
  }
  if (body instanceof FormData) {
    const boundary = `----OneFormBoundary${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`
    // react native always writes its own multipart content-type, so apps
    // that set a bare multipart/form-data header still send the boundary
    return {
      native: { form: formParts(body), boundary },
      type: `multipart/form-data; boundary=${boundary}`,
      forceType: true,
    }
  }
  throw new TypeError(
    'fetch: body must be a string, URLSearchParams, ArrayBuffer, typed array, Blob or FormData'
  )
}

// 204, 205 and 304 carry no body by definition, and neither does HEAD
function hasBody(method: string, status: number) {
  return method !== 'HEAD' && status !== 204 && status !== 205 && status !== 304
}

function concat(chunks: Uint8Array[]): Uint8Array {
  let length = 0
  for (const chunk of chunks) length += chunk.byteLength
  const bytes = new Uint8Array(length)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  return bytes
}

type Head = Omit<FetchNativeResponse, 'headers'> & { headers: Headers }

class StreamingResponse {
  readonly type = 'default'
  readonly ok: boolean
  readonly status: number
  readonly statusText: string
  readonly url: string
  readonly redirected: boolean
  readonly headers: Headers
  readonly body: ReadableStream<Uint8Array> | null

  constructor(head: Head, body: ReadableStream<Uint8Array> | null) {
    this.status = head.status
    this.ok = head.status >= 200 && head.status < 300
    this.statusText = head.statusText
    this.url = head.url
    this.redirected = head.redirected
    this.headers = head.headers
    this.body = body
  }

  get bodyUsed(): boolean {
    return this.body?.locked ?? false
  }

  async bytes(): Promise<Uint8Array> {
    if (!this.body) return new Uint8Array(0)
    if (this.body.locked) throw new TypeError('Already read')
    const reader = this.body.getReader()
    const chunks: Uint8Array[] = []
    for (;;) {
      const { done, value } = await reader.read()
      if (done) return concat(chunks)
      chunks.push(value)
    }
  }

  async arrayBuffer(): Promise<ArrayBuffer> {
    return bufferOf(await this.bytes())
  }

  async text(): Promise<string> {
    return new TextDecoder().decode(await this.bytes())
  }

  async json(): Promise<any> {
    return JSON.parse(await this.text())
  }

  // react native's Blob cannot be built from bytes in js, so the bytes go
  // into its native blob store, as xhr responses do
  async blob(): Promise<Blob> {
    const bytes = await this.bytes()
    const blobId = native().storeBlob(bufferOf(bytes))
    return BlobManager.createFromOptions({
      blobId,
      offset: 0,
      size: bytes.byteLength,
      type: this.headers.get('content-type') ?? '',
      lastModified: Date.now(),
    })
  }

  // urlencoded bodies, as react native's fetch reads them
  async formData(): Promise<FormData> {
    const form = new FormData()
    new URLSearchParams(await this.text()).forEach((value, name) => {
      form.append(name, value)
    })
    return form
  }

  clone(): StreamingResponse {
    if (this.bodyUsed) throw new TypeError('Already read')
    if (!this.body) return new StreamingResponse(this, null)
    const [mine, theirs] = this.body.tee()
    Reflect.set(this, 'body', mine)
    return new StreamingResponse(this, theirs)
  }
}

function abortReason(signal: AbortSignal): unknown {
  return signal.reason ?? Object.assign(new Error('Aborted'), { name: 'AbortError' })
}

async function fetch(input: string | URL | Request, init: RequestInit = {}): Promise<StreamingResponse> {
  const request = input instanceof Request ? input : undefined
  const signal = init.signal ?? request?.signal
  if (signal?.aborted) throw abortReason(signal)
  const url = request ? request.url : String(input)
  const method = (init.method ?? request?.method ?? 'GET').toUpperCase()
  const headers = new Headers(init.headers ?? request?.headers)
  const credentials = init.credentials ?? request?.credentials
  let body: unknown = init.body
  if (body == null && request && method !== 'GET' && method !== 'HEAD') {
    const bytes = await request.arrayBuffer()
    if (bytes.byteLength > 0) body = bytes
  }

  let nativeBody: NativeBody = {}
  if (body != null) {
    if (method === 'GET' || method === 'HEAD') {
      throw new TypeError(`fetch: a ${method} request cannot have a body`)
    }
    const encoded = encode(body)
    nativeBody = encoded.native
    if (encoded.type && (encoded.forceType || !headers.has('content-type'))) {
      headers.set('content-type', encoded.type)
    }
  }
  const list: FetchHeader[] = []
  headers.forEach((value, name) => {
    list.push({ name, value })
  })

  return new Promise((resolve, reject) => {
    const id = ++lastId
    let controller: ReadableStreamDefaultController<Uint8Array> | undefined
    let response: StreamingResponse | undefined
    let settled = false
    const settle = () => {
      settled = true
      signal?.removeEventListener('abort', onAbort)
    }
    const fail = (error: unknown) => {
      settle()
      if (response) controller?.error(error)
      else reject(error)
    }
    const onAbort = () => {
      if (settled || !signal) return
      native().cancel(id)
      fail(abortReason(signal))
    }
    signal?.addEventListener('abort', onAbort)

    native().start(
      id,
      { url, method, headers: list, ...nativeBody, omitCredentials: credentials === 'omit' },
      (head) => {
        if (settled) return
        const responseHeaders = new Headers()
        for (const { name, value } of head.headers) responseHeaders.append(name, value)
        const stream = hasBody(method, head.status)
          ? new ReadableStream<Uint8Array>({
              start(streamController) {
                controller = streamController
              },
              cancel() {
                if (settled) return
                settle()
                native().cancel(id)
              },
            })
          : null
        response = new StreamingResponse({ ...head, headers: responseHeaders }, stream)
        resolve(response)
      },
      (chunk) => {
        if (!settled) controller?.enqueue(new Uint8Array(chunk))
      },
      () => {
        if (settled) return
        settle()
        controller?.close()
      },
      (message) => {
        if (!settled) fail(new TypeError(`Network request failed: ${message}`))
      }
    )
  })
}

// replaces react native's buffered fetch. installs nothing when the binary
// has no OneFetch, leaving react native's fetch in place.
export function installFetch(): void {
  if (!NitroModules.hasHybridObject('OneFetch')) return
  // react native defines Headers, Request and Response lazily through
  // whatwg-fetch, which installs them only while the global fetch is still
  // its own. read one first so all three exist before fetch is replaced.
  if (typeof globalThis.Headers !== 'function' || typeof globalThis.Request !== 'function') {
    throw new Error("fetch: react native's Headers and Request must be installed before One's fetch")
  }
  // ios reaches react native's blob store through a bridge module's registry
  if (Platform.OS === 'ios') NativeModules.OneFetchBlobStore.install()
  Object.defineProperty(globalThis, 'fetch', {
    value: fetch,
    writable: true,
    configurable: true,
    enumerable: true,
  })
}
