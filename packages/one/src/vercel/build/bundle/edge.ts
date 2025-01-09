import path from "path";
import { build, transform } from "esbuild";
import type { BuildOptions, TransformOptions } from "esbuild";

import { bundleConstants } from "./constants";

export async function generateEdgeBundle({
  funcFolder,
  pageName,
  filePath,
  outfile = `${funcFolder}/index.js`,
}: {
  funcFolder: string;
  filePath: string;
  pageName: string;
  outfile?: string;
  Component;
}) {
  const edgeBuildConfig: Partial<BuildOptions | TransformOptions> = {
    target: "es2020",
    format: "cjs",
  };

  try {
    const { code: contents } = await transform(
      getEdgeHandlerCode(filePath),
      edgeBuildConfig as TransformOptions
    );

    return await build({
      ...(edgeBuildConfig as BuildOptions),
      ...bundleConstants,
      stdin: { contents, resolveDir: path.join(".") },
      outfile,
    });
  } catch (e) {
    console.error(e);
  }
}

export const getEdgeHandlerCode = (filePath) => `
  import { createElement } from 'react';
  import { renderToString } from 'react-dom/server';
  import Component from '${filePath}';

  export default async function(req) {
    const html = renderToString(createElement(Component, { req }));

    return new Response(
      \`<!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <link href="styles.css" rel="stylesheet">
        </head>
        <body>
          <div id="root">\${html}</div>
        </body>
      </html>\`, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8'
      },
    });
  }
`;
