import ansis from 'ansis'
import type { ExtraSteps } from './types'

export const extraSteps: ExtraSteps = async ({ projectName }) => {
  console.info(`
${ansis.green.bold('Done!')} Created ${ansis.greenBright(projectName)}

To run:

  cd ${projectName}
  bun dev

Open http://localhost:4200. See README.md for native setup.
`)
}
