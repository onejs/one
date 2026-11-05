// node 26.11 brand-checks Request.prototype.duplex. @hono/node-server's lightweight
// request does not define duplex, so `new Request(url, request)` throws
// Illegal invocation. copy the init fields and set duplex only when there is a body.
export function requestAtUrl(url: URL, request: Request): Request {
  const body = request.body
  const init: RequestInit & { duplex?: 'half' } = {
    method: request.method,
    headers: request.headers,
    signal: request.signal,
    cache: request.cache,
    credentials: request.credentials,
    integrity: request.integrity,
    mode: request.mode,
    redirect: request.redirect,
    referrer: request.referrer,
    referrerPolicy: request.referrerPolicy,
    keepalive: request.keepalive,
  }
  if (body != null) {
    init.body = body
    init.duplex = 'half'
  }
  return new Request(url, init)
}
