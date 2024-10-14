import type { FilterPattern, PluginOption } from 'vite'
import { createFilter } from 'vite'
// import { transformCommonJs, swcTransform } from '@vxrn/vite-native-swc'
import { transformFlowBabel } from './transformFlowBabel'

export async function transformFlow(
  input: string,
  { development = false }: { development?: boolean } = {}
) {
  // const { default: removeFlowTypes } = await import('flow-remove-types')
  // const stripped = removeFlowTypes(input).toString() as string
  // this freezes, likely due to not transforming react-native somehow properly, but not sure exactly how
  // const final = (await transformCommonJs('file.jsx', stripped))?.code

  const final = await transformFlowBabel(input)

  return final
}

export type Options = {
  include?: FilterPattern
  exclude?: FilterPattern
}

export default function createFlowPlugin(opts?: Options): PluginOption {
  if (!opts?.include || (Array.isArray(opts.include) && opts.include.length === 0)) {
    return
  }

  const filter = createFilter(opts?.include, opts?.exclude)

  return {
    name: '@vxrn/vite-flow',
    enforce: 'pre',
    transform(code, id) {
      if (filter(id)) {
        return transformFlow(code)
      }
      return null
    },
  }
}
