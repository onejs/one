import ansis from 'ansis'
import FSExtra from 'fs-extra'

import type { ExtraSteps } from './types'
import { exec } from '../helpers/exec'

export const extraSteps: ExtraSteps = async ({ isFullClone, projectName, packageManager }) => {
  const useBun = packageManager === 'bun'

  const runCommand = (scriptName: string) =>
    `${packageManager} ${useBun ? '' : 'run '}${scriptName}`

  if (isFullClone) {
    console.info(
      `\n${ansis.green.bold('Done!')} Created a new project under ./${ansis.greenBright(projectName)}`
    )
  }

  if (process.env.VXRN_DEMO_MODE) {
    exec(`ln -s ../one/run.mjs node_modules/.bin/one`)
  }

  console.info(`\nTo run: 

  ${ansis.green('cd')} ${projectName}
  ${ansis.green(runCommand('dev'))}\n`)
}

export const preInstall: ExtraSteps = async ({ projectName }) => {
  if (process.env.VXRN_DEMO_MODE) {
    // use one for one, lets us keep portal for developing in monorepo
    const pkgpath = 'package.json'
    const pkg = await FSExtra.readJSON(pkgpath)
    pkg.dependencies.one = `npm:one@${pkg.version}`
    await FSExtra.writeJSON(pkgpath, pkg, {
      spaces: 2,
    })
  }
}
