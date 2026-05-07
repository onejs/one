import type { RedirectStatusCode } from 'hono/utils/http-status'

// only 3xx codes that carry a Location header — excludes 300 (Multiple Choices),
// 304 (Not Modified), 305 (Use Proxy, deprecated), 306 (unused).
export type LocationRedirectStatusCode = Extract<
  RedirectStatusCode,
  301 | 302 | 303 | 307 | 308
>

export function isStatusRedirect(status: number): status is LocationRedirectStatusCode {
  return (
    status === 301 || status === 302 || status === 303 || status === 307 || status === 308
  )
}
