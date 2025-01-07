import { resolve } from 'node:path'
import type { VXRNOptionsFilled } from './getOptionsFilled'

type ServerOptions = Pick<VXRNOptionsFilled, 'build' | 'root'>

export const getServerCJSSetting = (options: ServerOptions) => {
  const serverOptions = options.build?.server
  return typeof serverOptions !== 'object' ? false : serverOptions.outputFormat === 'cjs'
}

export const getServerEntry = (options: ServerOptions) => {
  return resolve(
    process.cwd(),
    `${options.root}/dist/server/_virtual_one-entry.${getServerCJSSetting(options) ? 'c' : ''}js`
  )
}
