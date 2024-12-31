export type Middleware = (req: Request) => Response | void | Promise<Response | void>

export function createMiddleware(middleware: Middleware) {
  return middleware
}
