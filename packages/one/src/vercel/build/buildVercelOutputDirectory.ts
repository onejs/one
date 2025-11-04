import { join, resolve } from 'node:path'

import FSExtra from 'fs-extra'
import type { RollupOutput } from 'rollup'
import { isMatching, P } from 'ts-pattern'
import type { One } from '../../vite/types'
import { vercelBuildOutputConfigBase } from './config/vc-build-output-config-base'
import { serverlessVercelNodeJsConfig } from './config/vc-config-base'
import { serverlessVercelPackageJson } from './config/vc-package-base'
import { createApiServerlessFunction } from './generate/createApiServerlessFunction'
import { createSsrServerlessFunction } from './generate/createSsrServerlessFunction'
import { getPathFromRoute } from './getPathFromRoute'

const { copy, ensureDir, existsSync, writeJSON } = FSExtra

async function moveAllFiles(src: string, dest: string) {
  try {
    await copy(src, dest, { overwrite: true, errorOnExist: false })
  } catch (err) {
    console.error('Error moving files:', err)
  }
}

function getMiddlewaresByNamedRegex(buildInfoForWriting: One.BuildInfo) {
  return buildInfoForWriting.manifest.allRoutes
    .filter((r) => r.middlewares && r.middlewares.length > 0)
    .map((r) => [
      r.namedRegex,
      r.middlewares!.map((m) =>
        m.contextKey.startsWith('dist/middlewares/')
          ? m.contextKey.substring('dist/middlewares/'.length)
          : m.contextKey
      ),
    ])
    .sort((a, b) => b[0].length - a[0].length)
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

        await createApiServerlessFunction(route, compiledRoute.code, oneOptionsRoot, postBuildLogs)
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
      join(oneOptionsRoot, '.vercel/output/functions/_middleware.func')
    )
    await ensureDir(vercelMiddlewareDir)
    postBuildLogs.push(
      `[one.build][vercel] copying middlewares from ${distMiddlewareDir} to ${vercelMiddlewareDir}`
    )
    await moveAllFiles(resolve(join(oneOptionsRoot, 'dist', 'middlewares')), vercelMiddlewareDir)
    const vercelMiddlewarePackageJsonFilePath = resolve(join(vercelMiddlewareDir, 'package.json'))
    postBuildLogs.push(
      `[one.build][vercel] writing package.json to ${vercelMiddlewarePackageJsonFilePath}`
    )
    await writeJSON(vercelMiddlewarePackageJsonFilePath, serverlessVercelPackageJson)
    const wrappedMiddlewareEntryPointFilename = '_wrapped_middleware.js'
    const wrappedMiddlewareEntryPointPath = resolve(
      join(vercelMiddlewareDir, wrappedMiddlewareEntryPointFilename)
    )
    const middlewaresByNamedRegex = getMiddlewaresByNamedRegex(buildInfoForWriting)
    const middlewaresToVariableNameMap = middlewaresByNamedRegex.reduce(
      (acc, [namedRegex, middlewares]) => {
        ;(Array.isArray(middlewares) ? middlewares : [middlewares]).forEach((middleware) => {
          const middlewareVariableName = middleware.replace(/\.[a-z]+$/, '').replaceAll('/', '_')
          acc[middleware] = middlewareVariableName
        })
        return acc
      },
      {}
    )
    await FSExtra.writeFile(
      wrappedMiddlewareEntryPointPath,
      `
const middlewaresByNamedRegex = ${JSON.stringify(middlewaresByNamedRegex)}
${Object.entries(middlewaresToVariableNameMap)
  .map(([path, variableName]) => `import ${variableName} from './${path}'`)
  .join('\n')}

function getMiddleware(path) {
  switch (path){
      ${Object.entries(middlewaresToVariableNameMap)
        .map(([path, variableName]) => `case '${path}': return ${variableName}`)
        .join('\n')}
      default: return null
  }
}

const next = (e) => {
  const t = new Headers(null == e ? void 0 : e.headers)
  t.set('x-middleware-next', '1')
  return new Response(null, { ...e, headers: t })
}

const wrappedMiddlewareFunction = (request, event) => {
  const url = new URL(request.url)
  const pathname = url.pathname
  
  // Find matching middlewares for this request
  const matchingMiddlewares = middlewaresByNamedRegex
    .filter(([namedRegex]) => new RegExp(namedRegex).test(pathname))
    .reduce((prev, current) => prev.length > current[1]?.length ? prev : current[1], []);
  
  // Import and execute the middleware function
  const boundNext = () => {
    if (matchingMiddlewares.length === 0) {
      return next(request)
    }
      
    const middleware = getMiddleware(matchingMiddlewares.shift())
    return middleware ? middleware({request, event, next: boundNext}) : next(request)
  };
  return boundNext()
}

export { wrappedMiddlewareFunction as default }
  `
    )
    const middlewareVercelConfigFilePath = resolve(join(vercelMiddlewareDir, '.vc-config.json'))
    postBuildLogs.push(
      `[one.build][vercel] writing .vc-config.json to ${middlewareVercelConfigFilePath}`
    )
    await writeJSON(middlewareVercelConfigFilePath, {
      runtime: 'edge', // Seems that middlewares only work with edge runtime
      entrypoint: wrappedMiddlewareEntryPointFilename,
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
      ...(existsSync(distMiddlewareDir)
        ? [
            {
              src: '/(.*)',
              middlewarePath: '_middleware',
              continue: true,
            },
          ]
        : []),
      {
        handle: 'rewrite',
      },
      ...buildInfoForWriting.manifest.allRoutes
        .filter((r) => r.routeKeys && Object.keys(r.routeKeys).length > 0)
        .map((r) => ({
          src: r.namedRegex,
          dest: `${getPathFromRoute(r) || '/'}?${Object.entries(r.routeKeys)
            .map(([k, v]) => `${k}=$${v}`)
            .join('&')}`,
        })),
    ],
  })
  postBuildLogs.push(`[one.build] wrote vercel config to: ${vercelConfigFilePath}`)
}
