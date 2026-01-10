type MaybeResponse = Response | void | null
type RequestResponse = MaybeResponse | Promise<MaybeResponse>

export type MiddlewareContext = {}

export type Middleware = (props: {
  request: Request
  next: () => Promise<MaybeResponse>
  context: MiddlewareContext
}) => RequestResponse

export function createMiddleware(middleware: Middleware) {
  return middleware
}
