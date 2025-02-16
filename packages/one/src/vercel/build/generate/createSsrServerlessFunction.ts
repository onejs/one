import fs from "fs-extra";
import { join, resolve } from 'node:path';

import { One } from "@vxrn/one/src/vite/types";

import { serverlessVercelConfig } from "../config/vc-config-base";

// Documentation - Vercel Build Output v3
// https://vercel.com/docs/build-output-api/v3#build-output-api-v3
export async function createSsrServerlessFunction(
  pageName: string,
  buildInfo: One.BuildInfo,
  oneOptions: any,
  postBuildLogs: string[],
) {
  postBuildLogs.push(`[one.build][vercel.createSsrServerlessFunction] pageName: ${pageName}`);

  try { 
    const buildInfoAsString = JSON.stringify(buildInfo);
    const funcFolder = resolve(join(oneOptions.root, 'dist', `.vercel/output/functions/${pageName}.func`));
    await fs.ensureDir(funcFolder);

    const distServerFrom = resolve(join(oneOptions.root, 'dist', 'server'));
    const distServerTo = resolve(join(funcFolder, 'server'));
    await fs.ensureDir(distServerTo);
    postBuildLogs.push(`[one.build][vercel.createSsrServerlessFunction] copy server dist files from ${distServerFrom} to ${distServerTo}`);
    await fs.copy(distServerFrom, distServerTo);
    
    postBuildLogs.push(`[one.build][vercel.createSsrServerlessFunction] writing buildInfo.json`);
    await fs.writeFile(join(funcFolder, 'buildInfo.js'), `export default ${buildInfoAsString}`);

    await fs.ensureDir(join(funcFolder, 'entrypoint'));
    postBuildLogs.push(`[one.build][vercel.createSsrServerlessFunction] writing entrypoint to ${join(funcFolder, 'entrypoint', 'index.js')}`);
    await fs.writeFile(
        join(funcFolder, 'entrypoint', 'index.js'),
  `
  const buildInfoConfig = await import('../buildInfo.js');
  const entry = await import('../server/_virtual_one-entry.js');
  
  const handler = async (req, res) => {
    // console.debug("req.url", req.url);
    const url = new URL(req.url, \`https://\${process.env.VERCEL_URL}\`);
    const loaderProps = { 
      path: url.pathname,
      params: Object.fromEntries(url.searchParams.entries())
    }
    // console.debug("loaderProps", loaderProps)
    const postfix = url.pathname.endsWith('/') ? 'index.tsx' : '+ssr.tsx';
    const routeFile = \`.\${url.pathname}\${postfix}\`;
    // console.debug("routeFile", routeFile)
    // console.debug("buildInfoConfig", Object.keys(buildInfoConfig.default));
    // console.debug("buildInfoConfig.routeToBuildInfo", Object.keys(buildInfoConfig.default.routeToBuildInfo));
    const route = buildInfoConfig.default.routeToBuildInfo[routeFile];
    // console.debug("buildInfo route", route)

    const render = entry.default.render;
    const exported = await import(route.serverJsPath.replace('dist/','../'))
    const loaderData = await exported.loader?.(loaderProps)
    const preloads = route.preloads

    const rendered = await render({
      mode: route.type,
      loaderData,
      loaderProps,
      path: loaderProps?.path || '/',
      preloads,
    })
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.end(rendered)
  }

  export default handler;  
  `)

    postBuildLogs.push(`[one.build][vercel.createSsrServerlessFunction] writing package.json to ${join(funcFolder, 'package.json')}`);
    await fs.writeJSON(
      join(funcFolder, 'package.json'),
      { "type": "module" }
    )
    
    postBuildLogs.push(`[one.build][vercel.createSsrServerlessFunction] writing .vc-config.json to ${join(funcFolder, '.vc-config.json')}`);
    // Documentation - Vercel Build Output v3 Node.js Config
    //   https://vercel.com/docs/build-output-api/v3/primitives#node.js-config
    return fs.writeJson(join(funcFolder, '.vc-config.json'), {
      ...serverlessVercelConfig,
      environment: {
        ONE_DEFAULT_RENDER_MODE: 'ssr',
      }
    });
  } catch (e) {
    console.error(`[one.build][vercel.createSsrServerlessFunction] failed to generate func for ${pageName}`, e);
  }
}
