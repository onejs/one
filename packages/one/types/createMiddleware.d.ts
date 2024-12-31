export type Middleware = (req: Request) => Response | void | Promise<Response | void>;
export declare function createMiddleware(middleware: Middleware): Middleware;
//# sourceMappingURL=createMiddleware.d.ts.map