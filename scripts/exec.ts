import * as proc from 'node:child_process'
import { promisify } from 'node:util'

const exec_ = promisify(proc.exec)

export const exec = async (cmd: string, options?: proc.ExecOptions) => {
  return (await exec_(cmd, options)).stdout.toString()
}
