type MaybeResponse = Response | void | null
type RequestResponse = MaybeResponse | Promise<MaybeResponse>

// mutable object shared by every middleware in one request's chain. augment it
// with `declare module 'one' { interface MiddlewareContext { user?: User } }`
export interface MiddlewareContext {
  [key: string]: any
}

export type Middleware = (props: {
  request: Request
  next: () => Promise<MaybeResponse>
  context: MiddlewareContext
}) => RequestResponse

export function createMiddleware(middleware: Middleware) {
  return middleware
}
