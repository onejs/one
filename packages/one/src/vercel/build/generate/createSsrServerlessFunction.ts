import fs from "fs-extra";
import { basename, join } from 'node:path';
import React from "react";
import ReactDOMServer from "react-dom/server";

import { One } from "@vxrn/one/src/vite/types";

// Documentation - Vercel Build Output v3
// https://vercel.com/docs/build-output-api/v3#build-output-api-v3
export async function createSsrServerlessFunction(
  pageName: string,
  builtPageRoute: One.RouteBuildInfo,
  options: any,
  postBuildLogs: string[],
) {
  postBuildLogs.push(`[createSsrServerlessFunction] pageName: ${pageName}`);
  postBuildLogs.push(`[createSsrServerlessFunction] htmlPath: ${builtPageRoute.htmlPath}`);

  const funcFolder = join(options.root, 'dist', `.vercel/output/functions/${pageName}.func`);
  await fs.ensureDir(funcFolder);

  try {
    // postBuildLogs.push(`[createSsrServerlessFunction] copy shared assets to ${join(funcFolder, 'assets')}`);
    // await fs.copy(join(options.root, 'dist', 'api', 'assets'), join(funcFolder, 'assets'));

    await fs.ensureDir(join(funcFolder, 'entrypoint'));
    postBuildLogs.push(`[createSsrServerlessFunction] writing entrypoint to ${join(funcFolder, 'entrypoint', 'index.js')}`);
    // await fs.copy(join(options.root, builtPageRoute.clientJsPath), join(funcFolder, 'entrypoint', 'client.js'));
    // await fs.copy(join(options.root, builtPageRoute.serverJsPath), join(funcFolder, 'entrypoint', 'server.js'));
    // if (fs.existsSync(join(options.root, 'dist', builtPageRoute.preloadPath))) {
    //   await fs.copy(join(options.root, 'dist', builtPageRoute.preloadPath), join(funcFolder, 'entrypoint', 'preload.js'));
    // }

    
    
    // for (const preload in builtPageRoute.preloads) {
    //   postBuildLogs.push(`[createSsrServerlessFunction] writing preload`, preload, join(options.root, 'dist', preload))
    //   await fs.copy(join(options.root, 'dist', preload), join(funcFolder, 'entrypoint', basename(preload)));
    // }
    // const entry = await fs.readFile(join(options.root, builtPageRoute.clientJsPath), 'utf8')
    postBuildLogs.push(`[createSsrServerlessFunction] serverJsPath`, join(options.root, builtPageRoute.serverJsPath))
    // const { default: Component } = await import(join(options.root, builtPageRoute.clientJsPath))
    await fs.writeFile(
      join(funcFolder, 'entrypoint', 'index.js'),
      // getHandlerCode(
      //   ReactDOMServer.renderToString(React.createElement(Component)),
      //   pageName
      // )
      getHydrationScript(join(options.root, builtPageRoute.clientJsPath))
      // `<!DOCTYPE html>
      //   <head>
      //     <meta charset="UTF-8">
      //     <meta name="viewport" content="width=device-width, initial-scale=1.0">
      //     <link href="styles.css" rel="stylesheet">
      //   </head>
      //   <body>
      //     <div id="root"></div>
      //     <script src="client.js" defer></script>
      //   </body>`
    )

    postBuildLogs.push(`[createSsrServerlessFunction] writing package.json to ${join(funcFolder, 'package.json')}`);
    await fs.writeJSON(
      join(funcFolder, 'package.json'),
      { "type": "module" }
    )
    
    postBuildLogs.push(`[createSsrServerlessFunction] writing .vc-config.json to ${join(funcFolder, '.vc-config.json')}`);
    // Documentation - Vercel Build Output v3 Node.js Config
    //   https://vercel.com/docs/build-output-api/v3/primitives#node.js-config
    return fs.writeJson(join(funcFolder, '.vc-config.json'), {
      runtime: "nodejs20.x",
      handler: "entrypoint/index.js",
      launcherType: "Nodejs",
      shouldAddHelpers: true,
      shouldAddSourceMapSupport: true
    });
  } catch (e) {
    console.error('[createSsrServerlessFunction]', e);
  }
}

const getHydrationScript = (filePath: string) => `
  import React from "react";
  import ReactDOM from "react-dom/client";
  import Component from "${filePath}";

  ReactDOM.hydrateRoot(document.getElementById("root"), React.createElement(Component))
`;


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
