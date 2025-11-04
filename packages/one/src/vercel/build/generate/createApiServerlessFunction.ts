import { dirname, join, resolve } from 'node:path'
import generator from '@babel/generator'
import parser from '@babel/parser'
import traverse from '@babel/traverse'
import t from '@babel/types'
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
  postBuildLogs: string[]
) {
  try {
    const path = getPathFromRoute(route, { includeIndex: true })

    postBuildLogs.push(`[one.build][vercel.createSsrServerlessFunction] pageName: ${path}`)

    const funcFolder = join(oneOptionsRoot, `.vercel/output/functions/${path}.func`)
    await fs.ensureDir(funcFolder)

    if (code.includes('react')) {
      postBuildLogs.push(
        `[one.build][vercel.createSsrServerlessFunction] detected react in depenency tree for ${path}`
      )
      const reactPath = dirname(resolvePath('react/package.json', oneOptionsRoot))
      await fs.copy(resolve(reactPath), resolve(join(funcFolder, 'node_modules', 'react')))
    }

    const distAssetsFolder = resolve(join(funcFolder, 'assets'))
    postBuildLogs.push(
      `[one.build][vercel.createSsrServerlessFunction] copy shared assets to ${distAssetsFolder}`
    )
    const sourceAssetsFolder = resolve(join(oneOptionsRoot, 'dist', 'api', 'assets'))
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
function wrapHandlerFunctions(code) {
  const ast = parser.parse(code, {
    sourceType: 'module',
  })

  // TODO: idk why the TypeScript type does not match the actual type. Seems that we should use `traverse.default`, but TypeScript thinks we should use `traverse` directly.
  ;((traverse as any).default as typeof traverse)(ast, {
    FunctionDeclaration(path) {
      const { node } = path

      const functionNamesToHandle = [
        'GET',
        'POST',
        'PUT',
        'PATCH',
        'DELETE',
        'HEAD',
        'OPTIONS',
        // TODO: more possibilities?
      ]

      if (!node.id || !functionNamesToHandle.includes(node.id.name)) return
      // TODO: may need to also check if the function is export in any way, if
      // the isn't exported at all, we can skip.
      if (node.extra && node.extra.isWrapper) return
      if (node.extra && node.extra.isWrapped) return

      const originalName = `orig_${node.id.name}`

      const originalFunction = t.functionDeclaration(
        t.identifier(originalName),
        node.params,
        node.body,
        node.generator,
        node.async
      )

      /* The first argument of the handler function, which is the request object. */
      const requestIdentifier = t.identifier('request')
      const wrapperParams = [requestIdentifier]

      /* A local variable in the wrapper function to hold the URL object. */
      const urlIdentifier = t.identifier('url')
      /* A local variable in the wrapper function to hold parsed params. */
      const paramsIdentifier = t.identifier('params')

      const urlDecl = t.variableDeclaration('const', [
        t.variableDeclarator(
          urlIdentifier,
          t.newExpression(t.identifier('URL') /* Node.js global */, [
            t.memberExpression(requestIdentifier, t.identifier('url')) /* request.url */,
          ])
        ),
      ])

      const paramsDecl = t.variableDeclaration('const', [
        t.variableDeclarator(
          paramsIdentifier,
          t.callExpression(
            t.memberExpression(t.identifier('Object'), t.identifier('fromEntries')),
            [
              t.callExpression(
                t.memberExpression(
                  t.memberExpression(
                    urlIdentifier,
                    t.identifier('searchParams')
                  ) /* url.searchParams */,
                  t.identifier('entries')
                ),
                []
              ),
            ]
          )
        ),
      ])

      const callOrigFnStatement = t.callExpression(t.identifier(originalName), [
        requestIdentifier,
        t.objectExpression([t.objectProperty(t.identifier('params'), paramsIdentifier)]),
      ])

      const wrapperFunction = t.functionDeclaration(
        t.identifier(node.id.name + ''),
        wrapperParams,
        t.blockStatement([urlDecl, paramsDecl, t.returnStatement(callOrigFnStatement)])
        // No need to care if the wrapper function should be async,
        // since we didn't use any await in the wrapper function, and we'll
        // just return what the original function returns.
      )

      node.extra = node.extra || {}
      node.extra.isWrapped = true

      wrapperFunction.extra = wrapperFunction.extra || {}
      wrapperFunction.extra.isWrapper = true

      if (path.parentPath.isExportNamedDeclaration()) {
        path.replaceWithMultiple([originalFunction, t.exportNamedDeclaration(wrapperFunction, [])])
      } else {
        path.replaceWithMultiple([originalFunction, wrapperFunction])
      }
    },
  })

  // TODO: idk why the TypeScript type does not match the actual type. Seems that we should use `generator.default`, but TypeScript thinks we should use `generator` directly.
  const output = ((generator as any).default as typeof generator)(ast, {}).code
  return output
}
