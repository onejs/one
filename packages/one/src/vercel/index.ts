import { existsSync } from "node:fs";
import { join } from "node:path";
import { copy, emptyDir, ensureDir, writeJSON } from "fs-extra";
import { getTransformedRoutes } from "@vercel/routing-utils";

import { createStaticFile } from "./build/generate/createStaticFile";
import { createEdgeFunction } from "./build/generate/createEdgeFunction";
import { createServerlessFunction } from "./build/generate/createServerlessFunction";
import { createPrerender } from "./build/generate/createPrerender";
import { getRoutes } from "./utils/routes";

require("@babel/register")({
  extensions: [".ts", ".tsx", ".js", ".jsx"],
  presets: ["@babel/preset-env"],
  plugins: [["@babel/plugin-transform-react-jsx", { runtime: "automatic" }]],
});

async function prepareFileSystem() {
  await emptyDir(join(".vercel", "output"));

  return Promise.allSettled([ensureDir(join(".vercel", "output", "static"))]);
}

async function buildVercelOutput() {
  await prepareFileSystem();

  try {
    await Promise.allSettled(
      getRoutes().map(async (filePath) => {
        const { pageConfig, default: Component } = await import(filePath);

        switch (pageConfig.strategy) {
          case "static":
            return createStaticFile(Component, filePath);
          case "prerender":
            return createPrerender(Component, filePath, pageConfig);
          case "ssr":
            return createServerlessFunction(Component, filePath);
          case "edge":
            return createEdgeFunction(Component, filePath);

          default:
            return;
        }
      })
    );
  } catch (e) {
    console.error('vercel', e);
  }

  if (existsSync(join("public"))) {
    await copy(join("public"), join(".vercel", "output", "static"));
  }

  return writeJSON(".vercel/output/config.json", {
    ...(existsSync(process.cwd() + "/vercel.config.js")
      ? require(process.cwd() + "/vercel.config.js")?.default
      : {}),
    ...{
      version: 3,
      routes: getTransformedRoutes({
        cleanUrls: true,
      }).routes,
    },
  });
}

buildVercelOutput()
  .then(() => console.log("✅ Succesfully created Build Output API folder"))
  .catch((e) => console.log("❌ Failed to create Build Output API folder", e));
