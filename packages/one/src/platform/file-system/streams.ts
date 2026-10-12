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
    let bytes: Uint8Array<ArrayBuffer>
    try {
      bytes = await this.handle.readBytes(view ? view.byteLength : this.size)
    } catch (error) {
      // a failed pull errors the stream without invoking cancel, so the
      // owned handle must be released here; the close is idempotent and a
      // close failure must not mask the read failure.
      try {
        this.handle.close()
      } catch {
        // keep the read failure
      }
      throw error
    }
    if (!view) {
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
    try {
      await this.handle.writeBytes(chunk)
    } catch (error) {
      // like pull, a failed write errors the stream without abort, so the
      // owned handle must be released here without masking the failure.
      try {
        this.handle.close()
      } catch {
        // keep the write failure
      }
      throw error
    }
  }
}
