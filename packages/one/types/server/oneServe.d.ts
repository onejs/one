import type { Hono } from "hono";
import type { One } from "../vite/types";
/**
 * Lazy import functions for route modules.
 * Modules are loaded on-demand when a route is matched, not all upfront.
 */
type LazyRoutes = {
  serverEntry: () => Promise<{
    default: {
      render: (props: any) => any;
    };
  }>;
  pages: Record<string, () => Promise<any>>;
  api: Record<string, () => Promise<any>>;
  middlewares: Record<string, () => Promise<any>>;
};
export declare function oneServe(
  oneOptions: One.PluginOptions,
  buildInfo: One.BuildInfo,
  app: Hono,
  options?: {
    serveStaticAssets?: (ctx: { context: any }) => Promise<Response | undefined>;
    lazyRoutes?: LazyRoutes;
  },
): Promise<void>;
export {};
//# sourceMappingURL=oneServe.d.ts.map
