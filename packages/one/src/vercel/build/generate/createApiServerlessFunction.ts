import { dirname, join, resolve } from 'node:path'
import FSExtra from 'fs-extra'
import { resolvePath } from '@vxrn/resolve'

import fs from 'fs-extra'

import { serverlessVercelPackageJson } from '../config/vc-package-base'
import { serverlessVercelNodeJsConfig } from '../config/vc-config-base'

// Documentation - Vercel Build Output v3
// https://vercel.com/docs/build-output-api/v3#build-output-api-v3
export async function createApiServerlessFunction(
  pageName: string,
  code: string,
  oneOptionsRoot: string,
  postBuildLogs: string[]
) {
  try {
    postBuildLogs.push(`[one.build][vercel.createSsrServerlessFunction] pageName: ${pageName}`)

    const funcFolder = join(oneOptionsRoot, `.vercel/output/functions/${pageName}.func`)
    await fs.ensureDir(funcFolder)

    if (code.includes('react')) {
      postBuildLogs.push(
        `[one.build][vercel.createSsrServerlessFunction] detected react in depenency tree for ${pageName}`
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
    await fs.writeFile(entrypointFilePath, code)

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
      `[one.build][vercel.createSsrServerlessFunction] failed to generate func for ${pageName}`,
      e
    )
  }
}
