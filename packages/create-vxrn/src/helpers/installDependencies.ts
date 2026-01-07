import { execPromise } from '@vxrn/utils'

export async function installDependencies(
  projectRoot: string,
  packageManager: 'yarn' | 'npm' | 'pnpm' | 'bun'
) {
  const options = { cwd: projectRoot }
  let command: string

  switch (packageManager) {
    case 'bun':
      command = 'bun install'
      break
    case 'yarn':
      command = 'yarn install'
      break
    case 'pnpm':
      command = 'pnpm install'
      break
    default:
      command = 'npm install --force'
      break
  }

  try {
    await execPromise(command, options)
    console.info(`${packageManager} install completed successfully.`)
  } catch (error) {
    console.error(`Failed to install dependencies using ${packageManager}:`, error)
    throw error
  }
}
