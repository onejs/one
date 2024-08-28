import type { Connect } from 'vite';
/**
 * Prepends a middleware to a Connect server's middleware stack.
 */
export declare function prependMiddleware(
/** The Connect app server instance to prepend the middleware to. */
connectServer: Connect.Server, 
/** The middleware to prepend. */
middleware: Connect.NextHandleFunction): void;
//# sourceMappingURL=prependMiddleware.d.ts.map