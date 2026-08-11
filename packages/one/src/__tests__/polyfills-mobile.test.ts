import { describe, expect, it } from 'vitest'

describe('mobile polyfills', () => {
  it('installs working web streams globals when the runtime has none', async () => {
    const originals = ['ReadableStream', 'WritableStream', 'TransformStream'].map(
      (name) => [name, Object.getOwnPropertyDescriptor(globalThis, name)] as const
    )
    for (const [name] of originals) {
      Reflect.deleteProperty(globalThis, name)
    }

    try {
      await import('../polyfills-mobile')

      const stream = new globalThis.ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('hello'))
          controller.close()
        },
      })
      const reader = stream.getReader()
      const { value, done } = await reader.read()

      expect(done).toBe(false)
      expect(new TextDecoder().decode(value)).toBe('hello')
      expect(typeof globalThis.WritableStream).toBe('function')
      expect(typeof globalThis.TransformStream).toBe('function')
    } finally {
      for (const [name, descriptor] of originals) {
        Reflect.deleteProperty(globalThis, name)
        if (descriptor) {
          Object.defineProperty(globalThis, name, descriptor)
        }
      }
    }
  })
})
