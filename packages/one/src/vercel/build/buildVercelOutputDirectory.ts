import FSExtra from 'fs-extra'
import { join, resolve } from 'path'
import type { RollupOutput } from 'rollup'
import { isMatching, P } from 'ts-pattern'

import { createApiServerlessFunction } from './generate/createApiServerlessFunction'
import { createSsrServerlessFunction } from './generate/createSsrServerlessFunction'
import { serverlessVercelNodeJsConfig } from './config/vc-config-base'
import { serverlessVercelPackageJson } from './config/vc-package-base'
import { vercelBuildOutputConfig } from './config/vc-build-output-config-base'

import type { One } from '../../vite/types'

const { ensureDir, writeJSON } = FSExtra

async function moveAllFiles(src: string, dest: string) {
  try {
    await FSExtra.copy(src, dest, { overwrite: true, errorOnExist: false })
  } catch (err) {
    console.error('Error moving files:', err)
  }
}

export const buildVercelOutputDirectory = async ({
  apiOutput,
  buildInfoForWriting,
  clientDir,
  oneOptionsRoot,
  postBuildLogs
} : {
  apiOutput: RollupOutput | null,
  buildInfoForWriting: One.BuildInfo,
  clientDir: string,
  oneOptionsRoot: string,
  postBuildLogs: string[]
}) => {
  const { routeToBuildInfo } = buildInfoForWriting
  if (apiOutput) {
    const compiltedApiRoutes = (apiOutput?.output ?? []).filter(o => isMatching({ code: P.string, facadeModuleId: P.string }, o))
    for (const route of buildInfoForWriting.manifest.apiRoutes) {
      const compiledRoute = compiltedApiRoutes.find(compiled => {
        const flag = compiled.facadeModuleId.includes(route.file.replace('./',''))
        return flag
      })
      if (compiledRoute) {
        postBuildLogs.push(`[one.build][vercel] generating serverless function for apiRoute ${route.page}`)
        await createApiServerlessFunction(route.page, compiledRoute.code, oneOptionsRoot, postBuildLogs)
      } else {
        console.warn("\n 🔨[one.build][vercel] apiRoute missing code compilation for", route.file)
      }
    }
  }

  const vercelOutputFunctionsDir = join(oneOptionsRoot, 'dist', `.vercel/output/functions`);
  await ensureDir(vercelOutputFunctionsDir);

  for (const route of buildInfoForWriting.manifest.pageRoutes) {
    switch (route.type) {
      case "ssr": // Server Side Rendered
        const builtPageRoute = routeToBuildInfo[route.file]
        if (builtPageRoute) {
          postBuildLogs.push(`[one.build][vercel] generate serverless function for ${route.page} with ${route.type}`)
          await createSsrServerlessFunction(route.page, buildInfoForWriting, oneOptionsRoot, postBuildLogs)
        }
        break;
      case "ssg": // Static Site Generation
      case "spa": // Single Page Application
      default:
        // no-op, these will be copied from built dist/client into .vercel/output/static
        // postBuildLogs.push(`[one.build][vercel] pageRoute will be copied to .vercel/output/static for ${route.page} with ${route.type}`)
        break;
    }
  }

  const vercelMiddlewareDir = join(oneOptionsRoot, 'dist', '.vercel/output/functions/_middleware');
  await ensureDir(vercelMiddlewareDir);
  postBuildLogs.push(`[one.build][vercel] copying middlewares from ${join(oneOptionsRoot, 'dist', 'middlewares')} to ${vercelMiddlewareDir}`)
  await moveAllFiles(resolve(join(oneOptionsRoot, 'dist', 'middlewares')), vercelMiddlewareDir)
  const vercelMiddlewarePackageJsonFilePath = resolve(join(vercelMiddlewareDir, 'index.js'));
  postBuildLogs.push(`[one.build][vercel] writing package.json to ${vercelMiddlewarePackageJsonFilePath}`);
  await writeJSON(vercelMiddlewarePackageJsonFilePath, serverlessVercelPackageJson);
  postBuildLogs.push(`[one.build][vercel] writing .vc-config.json to ${join(vercelMiddlewareDir, '.vc-config.json')}`);
  await writeJSON(resolve(join(vercelMiddlewareDir, '.vc-config.json')), {
    ...serverlessVercelNodeJsConfig,
    handler: "_middleware.js",
  });

  const vercelOutputStaticDir = resolve(join(oneOptionsRoot, 'dist', '.vercel/output/static'));
  await ensureDir(vercelOutputStaticDir);

  postBuildLogs.push(`[one.build][vercel] copying static files from ${clientDir} to ${vercelOutputStaticDir}`)
  await moveAllFiles(clientDir, vercelOutputStaticDir)

  // Documentation - Vercel Build Output v3 config.json
  //   https://vercel.com/docs/build-output-api/v3/configuration#config.json-supported-properties
  const vercelConfigFilePath = resolve(join(oneOptionsRoot, 'dist', '.vercel/output', 'config.json'));
  await writeJSON(vercelConfigFilePath, vercelBuildOutputConfig);
  postBuildLogs.push(`[one.build] wrote vercel config to: ${vercelConfigFilePath}`);
}