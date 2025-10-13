type MaybeResponse = Response | void | null
type RequestResponse = MaybeResponse | Promise<MaybeResponse>

export interface MiddlewareContext {}

export type Middleware = (props: {
  request: Request
  next: (request?: Request) => Promise<Response | null | void>
  context: MiddlewareContext
}) => RequestResponse

export function createMiddleware(middleware: Middleware) {
  return middleware
}
