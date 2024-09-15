import path from 'node:path'
import ansis from 'ansis'
import prompts from 'prompts'
import { validateNpmName } from './validateNpmPackage'

export const getProjectName = async (projectPath?: string) => {
  if (typeof projectPath === 'string') {
    projectPath = projectPath.trim()
  }

  console.info()
  console.info(ansis.yellow(`  Hello. Let's create a new ${ansis.yellowBright(`①`)}  app...`))
  console.info()

  if (!projectPath) {
    const defaultName = 'hello-world'
    const res = await prompts({
      type: 'text',
      name: 'path',
      message: 'Name',
      initial: defaultName,
      validate: (name: string) => {
        const validation = validateNpmName(path.basename(path.resolve(name)))
        if (validation.valid) {
          return true
        }
        return 'Invalid name: ' + validation.problems![0]
      },
    })

    if (typeof res.path === 'string') {
      projectPath = res.path.trim() || defaultName
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
