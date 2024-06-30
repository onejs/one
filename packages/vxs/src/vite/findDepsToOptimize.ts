// thanks vitefu!

import FSExtra from 'fs-extra'
import fs from 'node:fs/promises'
import path, { dirname } from 'node:path'
import { createRequire } from 'node:module'

// given a package finds its dependencies and sub-dependencies
export async function getAllDependencies(root: string, depth = 20) {
  if (depth === 0) {
    return []
  }
  const pkgJsonPath = await findClosestPkgJsonPath(root)
  console.log('pkgJsonPath', pkgJsonPath)
  if (!pkgJsonPath) {
    throw new Error(`Cannot find package.json from ${root}`)
  }
  return await crawl(pkgJsonPath, depth - 1)
}

async function crawl(pkgJsonPath: string, depth = Infinity) {
  const pkgJson = await FSExtra.readJson(pkgJsonPath).catch((e) => {
    throw new Error(`Unable to read ${pkgJsonPath}`, { cause: e })
  })

  let dependencies = pkgJson.dependencies ? Object.keys(pkgJson.dependencies) : []

  await Promise.all(
    dependencies.map(async (depName) => {
      try {
        const resolved = createRequire(dirname(pkgJsonPath)).resolve(depName)
        const subDeps = await getAllDependencies(resolved, depth - 1)
        if (subDeps) {
          dependencies = [...dependencies, ...subDeps]
        }
      } catch (err) {
        // biome-ignore lint/suspicious/noConsoleLog: <explanation>
        console.log(`Couldn't resolve`, depName)
        // ok skip
      }
    })
  )

  return [...new Set(dependencies)]
}

async function findClosestPkgJsonPath(
  dir: string,
  predicate?: (pkg: string) => Promise<boolean>
): Promise<string | undefined> {
  if (dir.endsWith('package.json')) {
    dir = path.dirname(dir)
  }
  while (dir) {
    const pkg = path.join(dir, 'package.json')
    try {
      const stat = await fs.stat(pkg)
      if (stat.isFile() && (!predicate || (await predicate(pkg)))) {
        return pkg
      }
    } catch {}
    const nextDir = path.dirname(dir)
    if (nextDir === dir) break
    dir = nextDir
  }
  return undefined
}
