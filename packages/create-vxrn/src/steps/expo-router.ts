import ansis from 'ansis'

import type { ExtraSteps } from './types'
import { exec } from '../helpers/exec'

const packageManager = 'yarn'
const useYarn = packageManager === 'yarn'

const runCommand = (scriptName: string) => `${packageManager} ${useYarn ? '' : 'run '}${scriptName}`

const main: ExtraSteps = async ({ isFullClone, projectName }) => {
  exec(runCommand('patch-package'))

  if (isFullClone) {
    console.info(`
${ansis.green.bold('Done!')} Created a new project under ./${ansis.greenBright(projectName)} visit your project:
 • ${ansis.green('cd')} ${projectName}
`)
  }
  console.info(`
To start the dev server, run: ${ansis.green(runCommand('dev'))}
`)
}

export default main
