import path, { join } from "path";
import { build } from "esbuild";
import { bundleConstants } from "./constants";

export async function generateClientBundle({
  filePath,
  outdir = ".vercel/output/static/",
  pageName,
}: {
  filePath: string;
  outdir?: string;
  pageName: string;
}) {
  try {
    return await build({
      ...bundleConstants,
      stdin: {
        contents: getHydrationScript(filePath),
        resolveDir: path.join("."),
      },
      target: "es2020",
      outfile: join(outdir, `${pageName}.bundle.js`),
    });
  } catch (e) {
    console.error(e);
  }
}

const getHydrationScript = (filePath: string) => `
  import React from "react";
  import ReactDOM from "react-dom/client";
  import Component from "${filePath}";

  ReactDOM.hydrateRoot(document.getElementById("root"), React.createElement(Component))
`;
