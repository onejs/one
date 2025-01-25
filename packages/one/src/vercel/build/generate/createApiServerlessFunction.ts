import fs from "fs-extra";
import { join } from 'path';

// Documentation - Vercel Build Output v3
// https://vercel.com/docs/build-output-api/v3#build-output-api-v3
export async function createApiServerlessFunction(
  pageName: string,
  code: string,
  options: any,
  postBuildLogs: string[],
) {
  postBuildLogs.push(`[createApiServerlessFunction] pageName: ${pageName}`);

  const funcFolder = join(options.root, 'dist', `.vercel/output/functions/${pageName}.func`);
  await fs.ensureDir(funcFolder);

  try {
    if (code.includes("react")) {
      postBuildLogs.push(`[createApiServerlessFunction] detected react in depenency tree for ${pageName}`);
      await fs.copy(join(options.root, '..', '..', 'node_modules', 'react'), join(funcFolder, 'node_modules', 'react'));
    }

    postBuildLogs.push(`[createApiServerlessFunction] copy shared assets to ${join(funcFolder, 'assets')}`);
    await fs.copy(join(options.root, 'dist', 'api', 'assets'), join(funcFolder, 'assets'));

    await fs.ensureDir(join(funcFolder, 'entrypoint'));
    postBuildLogs.push(`[createApiServerlessFunction] writing entrypoint to ${join(funcFolder, 'entrypoint', 'index.js')}`);
    await fs.writeFile(
      join(funcFolder, 'entrypoint', 'index.js'),
      code
    )

    postBuildLogs.push(`[createApiServerlessFunction] writing package.json to ${join(funcFolder, 'package.json')}`);
    await fs.writeJSON(
      join(funcFolder, 'package.json'),
      { "type": "module" }
    )
    
    postBuildLogs.push(`[createApiServerlessFunction] writing .vc-config.json to ${join(funcFolder, '.vc-config.json')}`);
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
    console.error('[createApiServerlessFunction]', e);
  }
}
