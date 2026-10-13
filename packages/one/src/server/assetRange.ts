// cloudflare's assets binding ignores Range and always answers 200 with the
// whole file and no content-length, which safari refuses for <video>. this
// reads that full response and answers the 206 (or 416) the browser asked
// for. multi-range requests keep the full 200, which http allows.
export async function withRange(request: Request, response: Response): Promise<Response> {
  const range = request.headers.get('range')
  if (
    !range ||
    request.method !== 'GET' ||
    response.status !== 200 ||
    response.headers.has('content-range') ||
    response.headers.has('content-encoding')
  ) {
    return response
  }

  const match = /^bytes=(\d*)-(\d*)$/.exec(range.trim())
  if (!match || (!match[1] && !match[2])) return response

  const bytes = new Uint8Array(await response.arrayBuffer())
  const size = bytes.byteLength

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

  const headers = new Headers(response.headers)
  headers.set('accept-ranges', 'bytes')

  if (start >= size || start > end) {
    headers.set('content-range', `bytes */${size}`)
    return new Response(null, { status: 416, headers })
  }

  headers.set('content-range', `bytes ${start}-${end}/${size}`)
  headers.set('content-length', String(end - start + 1))
  return new Response(bytes.subarray(start, end + 1), { status: 206, headers })
}
