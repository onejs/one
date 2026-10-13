import { describe, expect, it } from 'vitest'
import { withRange } from './assetRange'

const bytes = Uint8Array.from({ length: 100 }, (_, i) => i)

// the assets binding streams in chunks; split so ranges cross chunk edges
function asset(headers: Record<string, string> = {}) {
  const chunks = [bytes.slice(0, 30), bytes.slice(30, 70), bytes.slice(70)]
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(chunk)
      controller.close()
    },
  })
  return new Response(body, {
    status: 200,
    // the binding sends no content-length
    headers: { 'content-type': 'video/webm', ...headers },
  })
}

function get(range?: string) {
  return new Request('https://x.test/a.webm', range ? { headers: { range } } : {})
}

async function body(response: Response) {
  return Array.from(new Uint8Array(await response.arrayBuffer()))
}

describe('withRange', () => {
  it('slices a range that crosses chunks', async () => {
    const res = await withRange(get('bytes=25-74'), asset())
    expect(res.status).toBe(206)
    expect(res.headers.get('content-range')).toBe('bytes 25-74/100')
    expect(res.headers.get('content-length')).toBe('50')
    expect(res.headers.get('content-type')).toBe('video/webm')
    expect(await body(res)).toEqual(Array.from(bytes.slice(25, 75)))
  })

  it('serves the safari probe and open-ended ranges', async () => {
    const probe = await withRange(get('bytes=0-1'), asset())
    expect(probe.headers.get('content-range')).toBe('bytes 0-1/100')
    expect(await body(probe)).toEqual([0, 1])

    const open = await withRange(get('bytes=90-'), asset())
    expect(open.headers.get('content-range')).toBe('bytes 90-99/100')
    expect(await body(open)).toEqual(Array.from(bytes.slice(90)))
  })

  it('serves suffix ranges and clamps the end', async () => {
    const suffix = await withRange(get('bytes=-5'), asset())
    expect(suffix.headers.get('content-range')).toBe('bytes 95-99/100')
    expect(await body(suffix)).toEqual([95, 96, 97, 98, 99])

    const clamped = await withRange(get('bytes=98-500'), asset())
    expect(clamped.headers.get('content-range')).toBe('bytes 98-99/100')
    expect(await body(clamped)).toEqual([98, 99])
  })

  it('answers 416 past the end', async () => {
    const res = await withRange(get('bytes=100-'), asset())
    expect(res.status).toBe(416)
    expect(res.headers.get('content-range')).toBe('bytes */100')
  })

  it('keeps the full response without a usable single range', async () => {
    for (const [request, response] of [
      [get(), asset()],
      [get('bytes=0-1,5-6'), asset()],
      [get('bytes=0-1'), asset({ 'content-encoding': 'gzip' })],
    ] as const) {
      expect(await withRange(request, response)).toBe(response)
    }
  })
})
