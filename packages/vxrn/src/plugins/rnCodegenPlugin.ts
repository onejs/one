import type { Plugin } from 'vite'
import { transformReactNativeCodegen } from '@vxrn/compiler'

// the transform itself lives in @vxrn/compiler so the metro transformer worker
// can run it too. vxrn depends on @vxrn/vite-plugin-metro, so the worker cannot
// reach back into this package.
export { getCodegen, transformReactNativeCodegen } from '@vxrn/compiler'

export function rnCodegenPlugin(options?: { projectRoot?: string }): Plugin {
  const handler: any = function (this: any, code: string, id: string) {
    return transformReactNativeCodegen(code, id, options?.projectRoot)
  }
  handler.order = 'pre' as const
  handler.handler = handler

  return {
    name: 'vxrn:rn-codegen',
    enforce: 'pre',
    transform: handler,
  } as Plugin
}
