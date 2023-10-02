import * as proc from 'node:child_process'
import { promisify } from 'node:util'

export const exec = promisify(proc.exec)
