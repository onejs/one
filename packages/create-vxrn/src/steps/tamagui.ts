import ansis from 'ansis'

import type { ExtraSteps } from './types'

const packageManager = 'yarn'
const useYarn = packageManager === 'yarn'

const runCommand = (scriptName: string) => `${packageManager} ${useYarn ? '' : 'run '}${scriptName}`

const main: ExtraSteps = async ({ isFullClone, projectName }) => {
  if (isFullClone) {
    console.info(`
  ${ansis.green.bold('Done!')} created a new project under ./${projectName}

visit your project:
  ${ansis.green('cd')} ${projectName}
`)
  }
  console.info(`
  To start the Remix development server, run:
    ${ansis.green(runCommand('dev'))}
`)
}

export default main
