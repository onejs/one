import ansis from 'ansis'

import type { ExtraSteps } from './types'

const main: ExtraSteps = async ({ isFullClone, projectName, packageManager }) => {
  const useBun = packageManager === 'bun'

  const runCommand = (scriptName: string) =>
    `${packageManager} ${useBun ? '' : 'run '}${scriptName}`

  if (isFullClone) {
    console.info(`
  ${ansis.green.bold('Done!')} Created a new project under ./${ansis.greenBright(projectName)}`)
  }
  console.info(`
  To run: 
  
  ${ansis.green('cd')} ${projectName}
  ${ansis.green(runCommand('dev'))}
`)
}

export default main
