import fs from "fs-extra";
import { join, resolve } from 'path';

import { serverlessVercelPackageJson } from "../config/vc-package-base";
import { serverlessVercelConfig } from "../config/vc-config-base";

// Documentation - Vercel Build Output v3
// https://vercel.com/docs/build-output-api/v3#build-output-api-v3
export async function createApiServerlessFunction(
  pageName: string,
  code: string,
  options: any,
  postBuildLogs: string[],
) {
  try {
    postBuildLogs.push(`[one.build][vercel.createSsrServerlessFunction] pageName: ${pageName}`);

    const funcFolder = join(options.root, 'dist', `.vercel/output/functions/${pageName}.func`);
    await fs.ensureDir(funcFolder);

    if (code.includes("react")) {
      postBuildLogs.push(`[one.build][vercel.createSsrServerlessFunction] detected react in depenency tree for ${pageName}`);
      await fs.copy(resolve(join(options.root, '..', '..', 'node_modules', 'react')), resolve(join(funcFolder, 'node_modules', 'react')));
    }

    const distAssetsFolder = resolve(join(funcFolder, 'assets'));
    postBuildLogs.push(`[one.build][vercel.createSsrServerlessFunction] copy shared assets to ${distAssetsFolder}`);
    await fs.copy(resolve(join(options.root, 'dist', 'api', 'assets')), distAssetsFolder);

    await fs.ensureDir(resolve(join(funcFolder, 'entrypoint')));
    const entrypointFilePath = resolve(join(funcFolder, 'entrypoint', 'index.js'))
    postBuildLogs.push(`[one.build][vercel.createSsrServerlessFunction] writing entrypoint to ${entrypointFilePath}`);
    await fs.writeFile(entrypointFilePath, code);

    const packageJsonFilePath = resolve(join(funcFolder, 'package.json'));
    postBuildLogs.push(`[one.build][vercel.createSsrServerlessFunction] writing package.json to ${packageJsonFilePath}`);
    await fs.writeJSON(packageJsonFilePath, serverlessVercelPackageJson);
    
    postBuildLogs.push(`[one.build][vercel.createSsrServerlessFunction] writing .vc-config.json to ${join(funcFolder, '.vc-config.json')}`);
    // Documentation - Vercel Build Output v3 Node.js Config
    //   https://vercel.com/docs/build-output-api/v3/primitives#node.js-config
    return fs.writeJson(join(funcFolder, '.vc-config.json'), {
      ...serverlessVercelConfig,
      handler: "entrypoint/index.js",
    });
  } catch (e) {
    console.error(`[one.build][vercel.createSsrServerlessFunction] failed to generate func for ${pageName}`, e);
  }
}
