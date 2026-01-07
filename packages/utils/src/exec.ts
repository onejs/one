import { execSync, type SpawnOptions, spawn } from 'node:child_process'

// Synchronous exec function using execSync
export const exec = (cmd: string, options?: Parameters<typeof execSync>[1]) => {
  return execSync(cmd, options)?.toString() || ''
}

export const execPromise = (
  cmd: string,
  options?: SpawnOptions & {
    quiet?: boolean
  }
) => {
  return new Promise<void>((resolve, reject) => {
    const [command, ...args] = cmd.split(' ')

    const child = spawn(command, args, {
      stdio: options?.quiet ? 'pipe' : 'inherit',
      shell: true,
      ...options,
    })

    if (!options?.quiet || process.env.DEBUG) {
      child.stdout?.pipe(process.stdout)
      child.stderr?.pipe(process.stderr)
    }

    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Command failed with exit code ${code}: ${cmd}`))
      } else {
        resolve()
      }
    })

    child.on('error', (error) => {
      reject(error)
    })
  })
}

export const execPromiseQuiet = (
  cmd: string,
  options?: SpawnOptions & {
    quiet?: boolean
  }
) => {
  return execPromise(cmd, {
    ...options,
    quiet: true,
  })
}
