import ansis from 'ansis'

import type { ExtraSteps } from './types'

const packageManager = 'useBun'
const useBun = packageManager === 'useBun'

const runCommand = (scriptName: string) => `${packageManager} ${useBun ? '' : 'run '}${scriptName}`

const main: ExtraSteps = async ({ isFullClone, projectName }) => {
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
