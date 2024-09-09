import ansis from 'ansis'
import FSExtra from 'fs-extra'
import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { cloneStarter } from './helpers/cloneStarter'
import { getProjectName } from './helpers/getProjectName'
import { getTemplateInfo } from './helpers/getTemplateInfo'
import { installDependencies } from './helpers/installDependencies'
import { validateNpmName } from './helpers/validateNpmPackage'
import prompts from 'prompts'
import { detectPackageManager, type PackageManagerName } from './helpers/detectPackageManager'

const { existsSync, readFileSync, writeFileSync } = FSExtra

let projectPath = ''

export async function create(args: { template?: string }) {
  const gitVersionString = Number.parseFloat(
    execSync(`git --version`).toString().replace(`git version `, '').trim()
  )
  if (gitVersionString < 2.27) {
    console.error(`\n\n ⚠️ vxrn can't install: Git version must be >= 2.27\n\n`)
    process.exit(1)
  }

  let projectName = ''
  let resolvedProjectPath = ''

  async function promptForName() {
    projectPath = await getProjectName()
    resolvedProjectPath = path.resolve(process.cwd(), projectPath)
    projectName = path.basename(resolvedProjectPath)
  }

  if (!projectPath) {
    await promptForName()

    while (fs.existsSync(resolvedProjectPath)) {
      console.info()
      console.info(
        ansis.yellow('⚠️'),
        `The folder ${ansis.underline(
          ansis.blueBright(projectName)
        )} already exists, lets try another name`
      )
      console.info()
      console.info()
      await promptForName()
    }
  }

  // space
  console.info()

  let template = await getTemplateInfo(args.template)

  const { valid, problems } = validateNpmName(projectName)
  if (!valid) {
    console.error(
      `Could not create a project called ${ansis.red(
        `"${projectName}"`
      )} because of npm naming restrictions:`
    )

    problems!.forEach((p) => console.error(`    ${ansis.red.bold('*')} ${p}`))
    process.exit(1)
  }

  console.info()

  const Spinner = await import('yocto-spinner').then((x) => x.default)

  const spinner = Spinner({
    text: `Creating...`,
    spinner: {
      frames: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'],
      interval: 100,
    },
  }).start()

  await FSExtra.mkdir(resolvedProjectPath)

  try {
    await cloneStarter(template, resolvedProjectPath, projectName)
    process.chdir(resolvedProjectPath)
  } catch (e) {
    console.error(`[vxrn] Failed to copy example into ${resolvedProjectPath}\n\n`, e)
    process.exit(1)
  }

  spinner.stop()
  console.info()
  console.info()
  console.info(ansis.green(`${projectName} created!`))
  console.info()
  console.info()

  // change root package.json's name to project name
  updatePackageJsonName(projectName, resolvedProjectPath)

  const packageManager: PackageManagerName = await (async () => {
    if ('packageManager' in template) {
      return template.packageManager
    }
    const found = await detectPackageManager()

    const allFound = Object.keys(found) as PackageManagerName[]

    if (allFound.length === 1) {
      return allFound[0]
    }

    const response = await prompts({
      name: 'packageManager',
      type: 'select',
      message: `Package Manager:`,
      choices: allFound
        .filter((x) => found[x])
        .map((name) => ({
          title: name,
          value: name,
        })),
    })

    return response.packageManager
  })()

  console.info()

  try {
    console.info()
    console.info(ansis.green(`Installing with ${packageManager}...`))
    console.info()
    await installDependencies(resolvedProjectPath, packageManager as any)
  } catch (e: any) {
    console.error('[vxrn] error installing with ' + packageManager + '\n' + `${e}`)
    process.exit(1)
  }

  // copy .env.default to .env
  const envDefault = path.join(resolvedProjectPath, '.env.default')
  const env = path.join(resolvedProjectPath, '.env')
  if (existsSync(envDefault) && !existsSync(env)) {
    await FSExtra.move(envDefault, env)
  }

  await template.extraSteps({
    packageManager,
    isFullClone: true,
    projectName,
    projectPath: resolvedProjectPath,
  })

  console.info()
}

function updatePackageJsonName(projectName: string, dir: string) {
  const packageJsonPath = path.join(dir, 'package.json')
  if (existsSync(packageJsonPath)) {
    const content = readFileSync(packageJsonPath).toString()
    const contentWithUpdatedName = content.replace(/("name": ")(.*)(",)/, `$1${projectName}$3`)
    writeFileSync(packageJsonPath, contentWithUpdatedName)
  }
}
