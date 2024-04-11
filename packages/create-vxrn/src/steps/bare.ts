import ansis from 'ansis'

import type { ExtraSteps } from './types'

const main: ExtraSteps = async ({ isFullClone, projectName }) => {
  if (isFullClone) {
    console.info(`
  ${ansis.green.bold('Done!')} created a new project under ./${projectName}

visit your project:
  ${ansis.green('cd')} ${projectName}
`)
  }
}

export default main
