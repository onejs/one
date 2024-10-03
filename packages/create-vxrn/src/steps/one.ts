import ansis from 'ansis'

import type { ExtraSteps } from './types'

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

export const preInstall: ExtraSteps = async ({ projectName }) => {
  //
}
