// byte-stream adapters over an open file handle, ported from
// expo-file-system's internal streams so chunking and close behavior match.

export type StreamHandle = {
  readBytes(length: number): Promise<Uint8Array<ArrayBuffer>>
  writeBytes(chunk: Uint8Array): Promise<void>
  close(): void
}

export class FileSystemReadableStreamSource implements UnderlyingByteSource {
  handle: StreamHandle
  size = 1024
  type = 'bytes' as const

  constructor(handle: StreamHandle) {
    this.handle = handle
  }

  cancel(): void {
    this.handle.close()
  }

  async pull(controller: ReadableByteStreamController): Promise<void> {
    const view = controller.byobRequest?.view
    if (!view) {
      const bytes = await this.handle.readBytes(this.size)
      if (bytes.length === 0) {
        // expo's reader closes the controller here but never the handle;
        // closing both is the documented behavior and avoids leaking the
        // native descriptor on every fully consumed stream.
        this.handle.close()
        controller.close()
        return
      }
      controller.enqueue(bytes)
      return
    }
    const bytes = await this.handle.readBytes(view.byteLength)
    if (bytes.length === 0) {
      this.handle.close()
      controller.close()
      controller.byobRequest?.respond(0)
      return
    }
    new Uint8Array(view.buffer, view.byteOffset, view.byteLength).set(bytes)
    controller.byobRequest?.respond(bytes.length)
  }
}

export class FileSystemWritableSink implements UnderlyingSink<Uint8Array> {
  handle: StreamHandle

  constructor(handle: StreamHandle) {
    this.handle = handle
  }

  abort(): void {
    this.close()
  }

  close(): void {
    this.handle.close()
  }

  async write(chunk: Uint8Array): Promise<void> {
    await this.handle.writeBytes(chunk)
  }
}
