import * as proc from 'node:child_process'
import { promisify } from 'node:util'

const exec_ = promisify(proc.exec)

export const exec = async (cmd: string, options?: proc.ExecOptions) => {
  console.info(`$ ${cmd}`)
  const proc = await exec_(cmd, options)
  if (proc.stderr) {
    throw new Error(`Error executing: ${proc.stderr}`)
  }
  return proc.stdout.toString()
}
