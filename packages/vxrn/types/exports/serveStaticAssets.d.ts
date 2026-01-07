import type { Context } from "hono";
export declare function serveStaticAssets({
  context,
  next,
}: {
  context: Context;
  next?: () => Promise<void>;
}): Promise<Response | undefined>;
//# sourceMappingURL=serveStaticAssets.d.ts.map
