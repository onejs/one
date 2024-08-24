import path from 'node:path'
import ansis from 'ansis'
import prompts from 'prompts'
import { validateNpmName } from './validateNpmPackage'

export const getProjectName = async (projectPath?: string) => {
  if (typeof projectPath === 'string') {
    projectPath = projectPath.trim()
  }

  if (!projectPath) {
    const res = await prompts({
      type: 'text',
      name: 'path',
      message: 'Project name:',
      initial: 'myapp',
      validate: (name) => {
        const validation = validateNpmName(path.basename(path.resolve(name)))
        if (validation.valid) {
          return true
        }
        return 'Invalid project name: ' + validation.problems![0]
      },
    })

    if (typeof res.path === 'string') {
      projectPath = res.path.trim()
    }
  }

  if (!projectPath) {
    const name = `create-vxrn`
    console.info()
    console.info('Please specify the project directory:')
    console.info(`  ${ansis.cyan(name)} ${ansis.green('<project-directory>')}`)
    console.info()
    console.info('For example:')
    console.info(`  ${ansis.cyan(name)} ${ansis.green('my-app')}`)
    console.info()
    console.info(`Run ${ansis.cyan(`${name} --help`)} to see all options.`)
    process.exit(1)
  }
  return projectPath
}
