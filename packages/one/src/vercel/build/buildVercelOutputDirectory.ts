import { join, resolve } from 'node:path'

import FSExtra from 'fs-extra'
import type { RollupOutput } from 'rollup'
import { isMatching, P } from 'ts-pattern'

import { createApiServerlessFunction } from './generate/createApiServerlessFunction'
import { createSsrServerlessFunction } from './generate/createSsrServerlessFunction'
import { serverlessVercelNodeJsConfig } from './config/vc-config-base'
import { serverlessVercelPackageJson } from './config/vc-package-base'
import { vercelBuildOutputConfigBase } from './config/vc-build-output-config-base'

import type { One } from '../../vite/types'

const { copy, ensureDir, existsSync, writeJSON } = FSExtra

async function moveAllFiles(src: string, dest: string) {
  try {
    await copy(src, dest, { overwrite: true, errorOnExist: false })
  } catch (err) {
    console.error('Error moving files:', err)
  }
}

export const buildVercelOutputDirectory = async ({
  apiOutput,
  buildInfoForWriting,
  clientDir,
  oneOptionsRoot,
  postBuildLogs,
}: {
  apiOutput: RollupOutput | null
  buildInfoForWriting: One.BuildInfo
  clientDir: string
  oneOptionsRoot: string
  postBuildLogs: string[]
}) => {
  const { routeToBuildInfo } = buildInfoForWriting
  if (apiOutput) {
    const compiltedApiRoutes = (apiOutput?.output ?? []).filter((o) =>
      isMatching({ code: P.string, facadeModuleId: P.string }, o)
    )
    for (const route of buildInfoForWriting.manifest.apiRoutes) {
      const compiledRoute = compiltedApiRoutes.find((compiled) => {
        const flag = compiled.facadeModuleId.includes(route.file.replace('./', ''))
        return flag
      })
      if (compiledRoute) {
        postBuildLogs.push(
          `[one.build][vercel] generating serverless function for apiRoute ${route.page}`
        )

        // @zetavg: don't think we actually need this one
        // await createApiServerlessFunction(
        //   route.page,
        //   compiledRoute.code,
        //   oneOptionsRoot,
        //   postBuildLogs
        // )

        await createApiServerlessFunction(
          route.urlCleanPath,
          compiledRoute.code,
          oneOptionsRoot,
          postBuildLogs
        )
      } else {
        console.warn('\n 🔨[one.build][vercel] apiRoute missing code compilation for', route.file)
      }
    }
  }

  const vercelOutputFunctionsDir = join(oneOptionsRoot, '.vercel/output/functions')
  await ensureDir(vercelOutputFunctionsDir)

  for (const route of buildInfoForWriting.manifest.pageRoutes) {
    switch (route.type) {
      case 'ssr': {
        // Server Side Rendered
        const builtPageRoute = routeToBuildInfo[route.file]
        if (builtPageRoute) {
          postBuildLogs.push(
            `[one.build][vercel] generate serverless function for ${route.page} with ${route.type}`
          )
          await createSsrServerlessFunction(
            route,
            buildInfoForWriting,
            oneOptionsRoot,
            postBuildLogs
          )
        }
        break
      }
      default:
        // no-op, these will be copied from built dist/client into .vercel/output/static
        // postBuildLogs.push(`[one.build][vercel] pageRoute will be copied to .vercel/output/static for ${route.page} with ${route.type}`)
        break
    }
  }

  const distMiddlewareDir = resolve(join(oneOptionsRoot, 'dist', 'middlewares'))
  if (existsSync(distMiddlewareDir)) {
    const vercelMiddlewareDir = resolve(
      join(oneOptionsRoot, '.vercel/output/functions/_middleware')
    )
    await ensureDir(vercelMiddlewareDir)
    postBuildLogs.push(
      `[one.build][vercel] copying middlewares from ${distMiddlewareDir} to ${vercelMiddlewareDir}`
    )
    await moveAllFiles(resolve(join(oneOptionsRoot, 'dist', 'middlewares')), vercelMiddlewareDir)
    const vercelMiddlewarePackageJsonFilePath = resolve(join(vercelMiddlewareDir, 'index.js'))
    postBuildLogs.push(
      `[one.build][vercel] writing package.json to ${vercelMiddlewarePackageJsonFilePath}`
    )
    await writeJSON(vercelMiddlewarePackageJsonFilePath, serverlessVercelPackageJson)
    const middlewareVercelConfigFilePath = resolve(join(vercelMiddlewareDir, '.vc-config.json'))
    postBuildLogs.push(
      `[one.build][vercel] writing .vc-config.json to ${middlewareVercelConfigFilePath}`
    )
    await writeJSON(middlewareVercelConfigFilePath, {
      ...serverlessVercelNodeJsConfig,
      handler: '_middleware.js',
    })
  }

  const vercelOutputStaticDir = resolve(join(oneOptionsRoot, '.vercel/output/static'))
  await ensureDir(vercelOutputStaticDir)

  postBuildLogs.push(
    `[one.build][vercel] copying static files from ${clientDir} to ${vercelOutputStaticDir}`
  )
  await moveAllFiles(clientDir, vercelOutputStaticDir)

  // Documentation - Vercel Build Output v3 config.json
  //   https://vercel.com/docs/build-output-api/v3/configuration#config.json-supported-properties
  const vercelConfigFilePath = resolve(join(oneOptionsRoot, '.vercel/output', 'config.json'))
  await writeJSON(vercelConfigFilePath, {
    ...vercelBuildOutputConfigBase,
    routes: [
      ...vercelBuildOutputConfigBase.routes,
      {
        handle: 'rewrite',
      },
      ...buildInfoForWriting.manifest.allRoutes
        .filter((r) => r.routeKeys && Object.keys(r.routeKeys).length > 0)
        .map((r) => ({
          src: r.namedRegex,
          dest: `${r.urlCleanPath}?${Object.entries(r.routeKeys)
            .map(([k, v]) => `${k}=$${v}`)
            .join('&')}`,
        })),
    ],
  })
  postBuildLogs.push(`[one.build] wrote vercel config to: ${vercelConfigFilePath}`)
}
