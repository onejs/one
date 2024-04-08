import { join } from 'node:path'

import * as FSExtra from 'fs-extra'
import { exec } from './exec'

setup()

/**
 * Should be immutable function that runs and ensures all the packages are setup correctly
 * Allowing you to make a new package just by adding a folder to packages and then running
 * `yarn setup` once.
 */

async function setup() {
  const workspaces = (await exec(`yarn workspaces list --json`)).trim().split('\n')
  const packagePaths = workspaces.map((p) => JSON.parse(p) as { location: string; name: string })

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
              await exec(`ln -s ../../biome.json ./biome.json`, {
                cwd,
              })
            }
          }
        })(),
      ])
    })
  )
}
