import { execSync } from 'node:child_process'

export const exec = (cmd: string, options?: Parameters<typeof execSync>[1]) => {
  return execSync(cmd, {
    stdio: process.env.DEBUG ? 'inherit' : 'ignore',
    ...options,
  })
}
