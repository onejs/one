/**
 * Redirects, auth errors and rejected search params answer a loader request as a
 * js module carrying a marker, so the client reads the outcome instead of a failed
 * module parse. Other responses pass through.
 */
export function loaderResponseToModule(
  response: Response,
  url: URL,
  isNativeRequest = false
): Response {
  // transform redirect responses into js modules so the client can detect
  // and handle them during client-side navigation (instead of the browser
  // silently following the 302 and trying to parse HTML as javascript)
  if (response.status >= 300 && response.status < 400) {
    const location = response.headers.get('location')
    if (location) {
      const redirectUrl = new URL(location, url.origin)
      const redirectPath = redirectUrl.pathname + redirectUrl.search + redirectUrl.hash
      const data = `{__oneRedirect:${JSON.stringify(redirectPath)},__oneRedirectStatus:${response.status}}`
      const body = isNativeRequest
        ? `exports.loader=function(){return ${data}}`
        : `export function loader(){return${data}}`
      return new Response(body, {
        headers: { 'Content-Type': 'text/javascript' },
      })
    }
  }

  // a client navigation reads the 400 marker of a rejected query and loads the page as a
  // document, so the server's own 400 page shows
  if (response.status === 400 || response.status === 401 || response.status === 403) {
    const data = `{__oneError:${response.status},__oneErrorMessage:${JSON.stringify(response.statusText || (response.status === 400 ? 'Bad Request' : 'Unauthorized'))}}`
    const body = isNativeRequest
      ? `exports.loader=function(){return ${data}}`
      : `export function loader(){return${data}}`
    return new Response(body, {
      headers: { 'Content-Type': 'text/javascript' },
    })
  }

  return response
}
