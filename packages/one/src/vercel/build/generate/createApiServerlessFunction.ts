import { dirname, join, resolve } from 'node:path'
import { parseSync } from 'oxc-parser'
import MagicString from 'magic-string'
import { resolvePath } from '@vxrn/resolve'
import FSExtra from 'fs-extra'

import fs from 'fs-extra'
import type { RouteInfo } from '../../../vite/types'
import { serverlessVercelNodeJsConfig } from '../config/vc-config-base'
import { serverlessVercelPackageJson } from '../config/vc-package-base'
import { getPathFromRoute } from '../getPathFromRoute'

// Documentation - Vercel Build Output v3
// https://vercel.com/docs/build-output-api/v3#build-output-api-v3
export async function createApiServerlessFunction(
  route: RouteInfo<string>,
  code: string,
  oneOptionsRoot: string,
  postBuildLogs: string[],
  outDir = 'dist'
) {
  try {
    const path = getPathFromRoute(route, { includeIndex: true })

    postBuildLogs.push(
      `[one.build][vercel.createSsrServerlessFunction] pageName: ${path}`
    )

    const funcFolder = join(oneOptionsRoot, `.vercel/output/functions/${path}.func`)
    await fs.ensureDir(funcFolder)

    if (code.includes('react')) {
      postBuildLogs.push(
        `[one.build][vercel.createSsrServerlessFunction] detected react in depenency tree for ${path}`
      )
      const reactPath = dirname(resolvePath('react/package.json', oneOptionsRoot))
      await fs.copy(
        resolve(reactPath),
        resolve(join(funcFolder, 'node_modules', 'react'))
      )
    }

    const distAssetsFolder = resolve(join(funcFolder, 'assets'))
    postBuildLogs.push(
      `[one.build][vercel.createSsrServerlessFunction] copy shared assets to ${distAssetsFolder}`
    )
    const sourceAssetsFolder = resolve(join(oneOptionsRoot, outDir, 'api', 'assets'))
    if (await FSExtra.pathExists(sourceAssetsFolder)) {
      await fs.copy(sourceAssetsFolder, distAssetsFolder)
    }

    await fs.ensureDir(resolve(join(funcFolder, 'entrypoint')))
    const entrypointFilePath = resolve(join(funcFolder, 'entrypoint', 'index.js'))
    postBuildLogs.push(
      `[one.build][vercel.createSsrServerlessFunction] writing entrypoint to ${entrypointFilePath}`
    )
    await fs.writeFile(entrypointFilePath, wrapHandlerFunctions(code))

    const packageJsonFilePath = resolve(join(funcFolder, 'package.json'))
    postBuildLogs.push(
      `[one.build][vercel.createSsrServerlessFunction] writing package.json to ${packageJsonFilePath}`
    )
    await fs.writeJSON(packageJsonFilePath, serverlessVercelPackageJson)

    postBuildLogs.push(
      `[one.build][vercel.createSsrServerlessFunction] writing .vc-config.json to ${join(funcFolder, '.vc-config.json')}`
    )
    // Documentation - Vercel Build Output v3 Node.js Config
    //   https://vercel.com/docs/build-output-api/v3/primitives#node.js-config
    return fs.writeJson(join(funcFolder, '.vc-config.json'), {
      ...serverlessVercelNodeJsConfig,
      handler: 'entrypoint/index.js',
    })
  } catch (e) {
    console.error(
      `[one.build][vercel.createSsrServerlessFunction] failed to generate func for ${route.file}`,
      e
    )
  }
}

/**
 * Vercel won't pass `{ params }` as the second argument to the handler function.
 * So we need to wrap the handler function to parse the params from the request,
 * and pass them to the handler function.
 */
function wrapHandlerFunctions(code: string): string {
  let parsed: any
  try {
    parsed = parseSync('api.js', code)
  } catch {
    return code
  }

  if (!parsed?.program) return code

  const functionNamesToHandle = new Set([
    'GET',
    'POST',
    'PUT',
    'PATCH',
    'DELETE',
    'HEAD',
    'OPTIONS',
  ])

  const ms = new MagicString(code)
  const wrappersToAppend: string[] = []

  for (const item of parsed.program.body || []) {
    let fnDecl: any = null
    let isExported = false
    let exportNode: any = null

    if (
      item.type === 'ExportNamedDeclaration' &&
      item.declaration?.type === 'FunctionDeclaration'
    ) {
      fnDecl = item.declaration
      isExported = true
      exportNode = item
    } else if (item.type === 'FunctionDeclaration') {
      fnDecl = item
      isExported = false
    }

    if (!fnDecl || !fnDecl.id?.name || !functionNamesToHandle.has(fnDecl.id.name)) {
      continue
    }

    const name = fnDecl.id.name
    const originalName = `orig_${name}`

    if (isExported) {
      ms.remove(exportNode.start, fnDecl.start)
    }

    ms.overwrite(fnDecl.id.start, fnDecl.id.end, originalName)

    const exportPrefix = isExported ? 'export ' : ''
    wrappersToAppend.push(
      `\n${exportPrefix}function ${name}(request) {\n  const url = new URL(request.url);\n  const params = Object.fromEntries(url.searchParams.entries());\n  return ${originalName}(request, { params });\n}`
    )
  }

  if (wrappersToAppend.length > 0) {
    ms.append(wrappersToAppend.join('\n'))
    return ms.toString()
  }

  return code
}
