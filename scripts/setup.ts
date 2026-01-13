import { join } from 'node:path'

import FSExtra from 'fs-extra'

setup()

/**
 * Should be immutable function that runs and ensures all the packages are setup correctly
 * Allowing you to make a new package just by adding a folder to packages and then running
 * `bun run setup` once.
 */

async function setup() {
  // Read workspaces from package.json since bun doesn't have a workspaces list command
  const rootPkg = JSON.parse(await FSExtra.readFile('package.json', 'utf-8'))
  const workspaceGlobs = rootPkg.workspaces || []

  const packagePaths: { location: string; name: string }[] = []

  for (const pattern of workspaceGlobs) {
    const baseDir = pattern.replace(/\/\*$/, '').replace(/^\.\//, '')
    try {
      const entries = await FSExtra.readdir(baseDir, { withFileTypes: true })
      for (const entry of entries) {
        if (!entry.isDirectory()) continue
        const pkgPath = join(baseDir, entry.name, 'package.json')
        try {
          const pkg = JSON.parse(await FSExtra.readFile(pkgPath, 'utf-8'))
          if (pkg.name) {
            packagePaths.push({ location: join(baseDir, entry.name), name: pkg.name })
          }
        } catch {
          // Skip directories without package.json
        }
      }
    } catch {
      // Skip patterns that don't resolve
    }
  }

  await Promise.all(
    packagePaths.map(async ({ location, name }) => {
      if (name === 'tamagui-monorepo') {
        // avoid monorepo itself
        return
      }

      const cwd = join(process.cwd(), location)
      await Promise.all([
        // ensure biome.json
        (async () => {
          const biomeConfig = join(cwd, 'biome.json')

          try {
            await FSExtra.readlink(biomeConfig)
          } catch (err) {
            if (`${err}`.includes(`no such file or directory`)) {
              console.error(`No biome.json found for ${name}, linking from monorepo root`)
              await FSExtra.symlink('../../biome.json', biomeConfig)
            }
          }
        })(),
      ])
    })
  )
}
