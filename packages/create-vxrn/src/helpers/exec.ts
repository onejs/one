import { execSync, exec as nodeExec } from 'node:child_process'
import { promisify } from 'node:util'

export const exec = (cmd: string, options?: Parameters<typeof execSync>[1]) => {
  return execSync(cmd, {
    stdio: process.env.DEBUG ? 'inherit' : 'ignore',
    ...options,
  })
}

const ep = promisify(nodeExec)

export const execPromise = (cmd: string, options?: Parameters<typeof execSync>[1]) => {
  return ep(cmd, {
    stdio: process.env.DEBUG ? 'inherit' : 'ignore',
    ...options,
  })
}
