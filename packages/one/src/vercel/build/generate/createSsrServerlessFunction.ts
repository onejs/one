import fs from 'fs-extra'
import { join, resolve } from 'node:path'
import { serverlessVercelNodeJsConfig } from '../config/vc-config-base'
import { serverlessVercelPackageJson } from '../config/vc-package-base'
import type { One } from '../../../vite/types'

// Documentation - Vercel Build Output v3
// https://vercel.com/docs/build-output-api/v3#build-output-api-v3
export async function createSsrServerlessFunction(
  pageName: string,
  buildInfo: One.BuildInfo,
  oneOptionsRoot: string,
  postBuildLogs: string[]
) {
  try {
    postBuildLogs.push(`[one.build][vercel.createSsrServerlessFunction] pageName: ${pageName}`)

    const buildInfoAsString = JSON.stringify(buildInfo)
    const funcFolder = resolve(join(oneOptionsRoot, `.vercel/output/functions/${pageName}.func`))
    await fs.ensureDir(funcFolder)

    const distServerFrom = resolve(join(oneOptionsRoot, 'dist', 'server'))
    const distServerTo = resolve(join(funcFolder, 'server'))
    await fs.ensureDir(distServerTo)
    postBuildLogs.push(
      `[one.build][vercel.createSsrServerlessFunction] copy server dist files from ${distServerFrom} to ${distServerTo}`
    )
    await fs.copy(distServerFrom, distServerTo)

    postBuildLogs.push(`[one.build][vercel.createSsrServerlessFunction] writing buildInfo.json`)
    await fs.writeFile(join(funcFolder, 'buildInfo.js'), `export default ${buildInfoAsString}`)

    await fs.ensureDir(join(funcFolder, 'entrypoint'))
    const entrypointFilePath = resolve(join(funcFolder, 'entrypoint', 'index.js'))
    postBuildLogs.push(
      `[one.build][vercel.createSsrServerlessFunction] writing entrypoint to ${entrypointFilePath}`
    )
    await fs.writeFile(
      entrypointFilePath,
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
    const postfix = url.pathname.endsWith('/') ? 'index.tsx' : '+ssr.tsx';
    const routeFile = \`.\${url.pathname}\${postfix}\`;
    const route = buildInfoConfig.default.routeToBuildInfo[routeFile];

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
    // https://vercel.com/docs/deployments/skew-protection#supported-frameworks__
    if (process.env.VERCEL_SKEW_PROTECTION_ENABLED === '1') {
      res.setHeader('Set-Cookie', [
        \`__vdpl=\${process.env.VERCEL_DEPLOYMENT_ID}; HttpOnly\`,
      ]);
    }
    res.end(rendered)
  }

  export default handler;
  `
    )

    const packageJsonFilePath = resolve(join(funcFolder, 'package.json'))
    postBuildLogs.push(
      `[one.build][vercel.createSsrServerlessFunction] writing package.json to ${packageJsonFilePath}`
    )
    await fs.writeJSON(packageJsonFilePath, serverlessVercelPackageJson)

    // Documentation - Vercel Build Output v3 Node.js Config
    //   https://vercel.com/docs/build-output-api/v3/primitives#node.js-config
    const vcConfigFilePath = resolve(join(funcFolder, '.vc-config.json'))
    postBuildLogs.push(
      `[one.build][vercel.createSsrServerlessFunction] writing .vc-config.json to ${vcConfigFilePath}`
    )
    return fs.writeJson(vcConfigFilePath, {
      ...serverlessVercelNodeJsConfig,
      handler: 'entrypoint/index.js',
      environment: {
        ...serverlessVercelNodeJsConfig.environment,
        ONE_DEFAULT_RENDER_MODE: 'ssr',
      },
    })
  } catch (e) {
    console.error(
      `[one.build][vercel.createSsrServerlessFunction] failed to generate func for ${pageName}`,
      e
    )
  }
}
