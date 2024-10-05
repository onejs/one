import ansis from 'ansis'
import { join } from 'node:path'
import type { ExtraSteps } from './types'
import FSExtra from 'fs-extra'

export const extraSteps: ExtraSteps = async ({ isFullClone, projectName, packageManager }) => {
  const useBun = packageManager === 'bun'

  const runCommand = (scriptName: string) =>
    `${packageManager} ${useBun ? '' : 'run '}${scriptName}`

  if (isFullClone) {
    console.info(
      `\n${ansis.green.bold('Done!')} Created a new project under ./${ansis.greenBright(projectName)}`
    )
  }

  console.info(`\nTo run: 

  ${ansis.green('cd')} ${projectName}
  ${ansis.green(runCommand('dev'))}\n`)
}

export const preInstall: ExtraSteps = async ({ projectName, packageManager, projectPath }) => {
  if (packageManager === 'pnpm') {
    await FSExtra.writeFile(join(projectPath, `.npmrc`), `node-linker=hoisted\n`)
  }
  if (packageManager === 'yarn') {
    await FSExtra.writeFile(join(projectPath, 'yarn.lock'), '')
    console.info(`Created empty yarn.lock file`)
  }
}
