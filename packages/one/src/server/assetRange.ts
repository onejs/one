// cloudflare's assets binding ignores Range and always answers 200 with the
// whole file, usually with no content-length, which safari refuses for
// <video>. this answers the 206 (or 416) the browser asked for. multi-range
// requests and stale If-Range validators keep the full 200, which http allows.
export async function withRange(request: Request, response: Response): Promise<Response> {
  const range = request.headers.get('range')
  if (
    !range ||
    request.method !== 'GET' ||
    response.status !== 200 ||
    !response.body ||
    response.headers.has('content-range') ||
    response.headers.has('content-encoding') ||
    !ifRangeMatches(request.headers.get('if-range'), response.headers)
  ) {
    return response
  }

  const match = /^bytes=(\d*)-(\d*)$/.exec(range.trim())
  if (!match || (!match[1] && !match[2])) return response

  const length = response.headers.get('content-length')
  const known = length && /^\d+$/.test(length) ? Number(length) : undefined

  const headers = new Headers(response.headers)
  headers.set('accept-ranges', 'bytes')
  headers.delete('content-length')

  // only the requested bytes are kept in memory. with a known size reading
  // stops after them; without one the size only comes from reading to the end
  const { size, kept, keptStart } = await readRange(response.body, match, known)
  const span = resolve(match, size)
  if (!span) {
    headers.set('content-range', `bytes */${size}`)
    return new Response(null, { status: 416, headers })
  }
  headers.set('content-range', `bytes ${span.start}-${span.end}/${size}`)
  headers.set('content-length', String(span.end - span.start + 1))
  return new Response(kept.subarray(span.start - keptStart, span.end - keptStart + 1), {
    status: 206,
    headers,
  })
}

// rfc 9110 13.1.5: honor the range only when the validator still matches,
// using a strong etag comparison or an exact last-modified date
function ifRangeMatches(ifRange: string | null, headers: Headers) {
  if (!ifRange) return true
  const value = ifRange.trim()
  if (value.startsWith('"')) {
    const etag = headers.get('etag')
    return !!etag && !etag.startsWith('W/') && etag === value
  }
  if (value.startsWith('W/')) return false
  return headers.get('last-modified') === value
}

function resolve(match: RegExpExecArray, size: number) {
  let start: number
  let end: number
  if (!match[1]) {
    // suffix range: the last n bytes
    start = Math.max(0, size - Number(match[2]))
    end = size - 1
  } else {
    start = Number(match[1])
    end = match[2] ? Math.min(Number(match[2]), size - 1) : size - 1
  }
  if (start >= size || start > end) return
  return { start, end }
}

async function readRange(
  body: ReadableStream<Uint8Array>,
  match: RegExpExecArray,
  known: number | undefined
) {
  const span = known === undefined ? undefined : (resolve(match, known) ?? { start: known, end: -1 })
  // an unknown-size suffix range keeps a rolling tail of the requested length
  const suffix = !span && !match[1] ? Number(match[2]) : 0
  const from = span ? span.start : match[1] ? Number(match[1]) : 0
  const to = span ? span.end : match[2] && match[1] ? Number(match[2]) : Number.POSITIVE_INFINITY

  const chunks: Uint8Array[] = []
  let keptBytes = 0
  let size = 0
  const reader = body.getReader()
  while (known === undefined || size <= to) {
    const { done, value } = await reader.read()
    if (done) break
    const chunkStart = size
    size += value.byteLength
    if (suffix) {
      chunks.push(value)
      keptBytes += value.byteLength
      // drop whole chunks that fall before the rolling tail
      while (chunks.length > 1 && keptBytes - chunks[0].byteLength >= suffix) {
        keptBytes -= chunks.shift()!.byteLength
      }
      continue
    }
    const lo = Math.max(from, chunkStart)
    const hi = Math.min(to + 1, size)
    if (hi > lo) {
      chunks.push(value.subarray(lo - chunkStart, hi - chunkStart))
      keptBytes += hi - lo
    }
  }
  if (known !== undefined) {
    await reader.cancel()
    size = known
  }

  const kept = new Uint8Array(keptBytes)
  let at = 0
  for (const chunk of chunks) {
    kept.set(chunk, at)
    at += chunk.byteLength
  }
  return { size, kept, keptStart: suffix ? size - keptBytes : from }
}
