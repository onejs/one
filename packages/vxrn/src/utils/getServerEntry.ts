import type { VXRNOptionsFilled } from './getOptionsFilled'

type ServerOptions = Pick<VXRNOptionsFilled, 'build' | 'root'>

export const getServerCJSSetting = (options: ServerOptions) => {
  const serverOptions = options.build?.server
  return typeof serverOptions !== 'object' ? true : serverOptions.outputFormat === 'cjs'
}

export const getServerEntry = (options: ServerOptions) => {
  return `${options.root}/dist/server/_virtual_vxs-entry.${getServerCJSSetting(options) ? 'c' : ''}js`
}
