import fs from "fs-extra";
import { join } from 'path';

import { generateClientBundle } from "../bundle/client";
import { generateLambdaBundle } from "../bundle/serverless";
import { sourceMapsEnabled } from "process";
import { RouteInfo } from "@vxrn/one/src/server/createRoutesManifest";

// Documentation - Vercel Build Output v3
// https://vercel.com/docs/build-output-api/v3#build-output-api-v3
export async function createServerlessApiFunction(
  route: RouteInfo,
  code: string,
  options: any,
  postBuildLogs: string[],
) {
  const pageName = route.page.replace('/api/','')
  postBuildLogs.push(`[createServerlessApiFunction] pageName: ${pageName}`);

  const funcFolder = join(options.root, 'dist', `.vercel/output/functions/api/${pageName}.func`);
  await fs.ensureDir(funcFolder);

  try {
    // await Promise.allSettled([
    //   generateClientBundle({ filePath, pageName }),
    //   generateLambdaBundle({
    //     funcFolder,
    //     pageName,
    //     Component,
    //   }),
    // ]);

    if (code.includes("react")) {
      postBuildLogs.push(`[createServerlessApiFunction] detected react in depenency tree for ${pageName}`);
      await fs.copy(join(options.root, '..', '..', 'node_modules', 'react'), join(funcFolder, 'node_modules', 'react'));
    }

    postBuildLogs.push(`[createServerlessApiFunction] copy shared assets to ${join(funcFolder, 'assets')}`);
    await fs.copy(join(options.root, 'dist', 'api', 'assets'), join(funcFolder, 'assets'));

    await fs.ensureDir(join(funcFolder, 'entrypoint'));
    postBuildLogs.push(`[createServerlessApiFunction] writing entrypoint to ${join(funcFolder, 'entrypoint', 'index.js')}`);
    await fs.writeFile(
      join(funcFolder, 'entrypoint', 'index.js'),
      code
        // `export default function index(request, event) {
        //   return new Response(Hello, from the Serverless!)
        // }`
    )

    postBuildLogs.push(`[createServerlessApiFunction] writing package.json to ${join(funcFolder, 'package.json')}`);
    await fs.writeJSON(
      join(funcFolder, 'package.json'),
      { "type": "module" }
    )
    
    postBuildLogs.push(`[createServerlessApiFunction] writing .vc-config.json to ${join(funcFolder, '.vc-config.json')}`);
    // Documentation - Vercel Build Output v3 Node.js Config
    //   https://vercel.com/docs/build-output-api/v3/primitives#node.js-config
    return fs.writeJson(join(funcFolder, '.vc-config.json'), {
      runtime: "nodejs20.x",
      // handler: "index.js",
      handler: "entrypoint/index.js",
      launcherType: "Nodejs",
      shouldAddHelpers: true,
      shouldAddSourceMapSupport: true
    });
  } catch (e) {
    console.error('[createServerlessApiFunction]', e);
  }
}
