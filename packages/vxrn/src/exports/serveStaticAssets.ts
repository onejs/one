import { serveStatic } from "@hono/node-server/serve-static";
import type { Context } from "hono";

export async function serveStaticAssets({
  context,
  next,
}: {
  context: Context;
  next?: () => Promise<void>;
}) {
  let didCallNext = false;

  const response = await serveStatic({
    root: "./dist/client",
    onFound: (_path, c) => {
      c.header("Cache-Control", `public, immutable, max-age=31536000`);
    },
  })(context, async () => {
    didCallNext = true;
    await next?.();
  });

  if (!response || didCallNext) {
    return;
  }

  return response;
}
