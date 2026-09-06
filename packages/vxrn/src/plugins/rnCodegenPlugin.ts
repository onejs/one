import type { Plugin } from 'vite'
import { transformReactNativeCodegen } from '@vxrn/compiler'

// the transform itself lives in @vxrn/compiler so the metro transformer worker
// can run it too. vxrn depends on @vxrn/vite-plugin-metro, so the worker cannot
// reach back into this package.
export { transformReactNativeCodegen } from '@vxrn/compiler'

export function rnCodegenPlugin(options?: { projectRoot?: string }): Plugin {
  return {
    name: 'vxrn:rn-codegen',
    enforce: 'pre',
    transform: {
      order: 'pre',
      handler(code: string, id: string) {
        return transformReactNativeCodegen(code, id, options?.projectRoot)
      },
    },
  } as Plugin
}
