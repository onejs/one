import React from "react";
import path from "node:path";
import ReactDOMServer from "react-dom/server";
import { build, transform } from "esbuild";
import type { BuildOptions, TransformOptions } from "esbuild";

import { bundleConstants } from "./constants";

export async function generateLambdaBundle({
  Component,
  funcFolder,
  pageName,
  outfile = `${funcFolder}/index.js`,
}: {
  Component: React.ElementType;
  funcFolder: string;
  pageName: string;
  outfile?: string;
}) {
  const lambdaBuildConfig: Partial<BuildOptions | TransformOptions> = {
    target: "node16",
    format: "cjs",
  };

  const { code: contents } = await transform(
    getHandlerCode(
      ReactDOMServer.renderToString(React.createElement(Component)),
      pageName
    ),
    lambdaBuildConfig as TransformOptions
  );

  try {
    return await build({
      ...(lambdaBuildConfig as BuildOptions),
      ...bundleConstants,
      stdin: { contents, resolveDir: path.join(".") },
      outfile,
    });
  } catch (e) {
    console.error(e);
  }
}

const getHandlerCode = (html: string, pageName: string) => `
  import { createElement } from 'react';
  import { renderToString } from 'react-dom/server';

  export default (req, res) => {  
    res.setHeader('Content-type', 'text/html');

    res.end(\`<!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link href="styles.css" rel="stylesheet">
      </head>
      <body>
        <div id="root">${html}</div>
        <script src="${pageName}.bundle.js" defer></script>
      </body>
    </html>\`)
  }
`;
