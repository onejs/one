import type { Middleware } from 'one'
const middleware: Middleware = async ({ request, next }) => {
  const response = await next()
  if (response && response.status >= 400) {
    await trackApiError(response, request, new URL(request.url).pathname)
  }
  return response
}
async function trackApiError(response: Response, request: Request, pathname: string) {
  try {
    const contentType = response.headers.get('content-type')
    if (!contentType?.includes('application/json')) return
    const body = await response.clone().json()
    if (process.env.NODE_ENV === 'development') {
      console.error(`[middleware] ${request.method} ${pathname} - ${response.status}`, {
        errorCode: body.code,
        errorMessage: body.error || body.message,
      })
    }
  } catch {
    // ignore parse errors
  }
}
export default middleware
