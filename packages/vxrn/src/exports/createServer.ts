import { serveStatic } from "@hono/node-server/serve-static";
import { compress } from "hono/compress";
import { dirname, join } from "node:path";
import type { VXRNServeOptions } from "../types";
import type { Hono } from "hono";
import { serveStaticAssets } from "./serveStaticAssets";

export const applyCompression = (app: Hono, options: VXRNServeOptions) => {
  if (options.compress !== false) {
    app.use(compress());
  }
};

export const createProdServer = async (
  app: Hono,
  options: VXRNServeOptions,
  { skipCompression }: { skipCompression?: boolean } = {},
) => {
  // when called via serve(), compression is already applied before beforeRegisterRoutes
  if (!skipCompression) {
    applyCompression(app, options);
  }

  app.use("*", async (context, next) => {
    return await serveStaticAssets({ context, next });
  });

  app.notFound(async (c) => {
    const path = c.req.path;
    let currentDir = dirname(path);

    while (true) {
      const response = await serveStatic({
        root: "./dist/client",
        path: join(currentDir, "+not-found.html"),
      })(c, async () => {});

      if (response && response.body) {
        c.status(404);
        return c.body(response.body);
      }

      const nextDir = dirname(currentDir);
      if (nextDir === currentDir) {
        break;
      }
      currentDir = nextDir;
    }

    return c.text("404 Not Found", { status: 404 });
  });

  return app;
};
