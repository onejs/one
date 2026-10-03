import { compiledMDX, extractFrontmatter } from './serverShared'
import type { CompiledMDX } from './types'

let runtimePromise:
  | Promise<typeof import('../vendor/satteri-wasm/runtime.js')>
  | undefined

export { extractFrontmatter }

export async function compileMDX(source: string): Promise<CompiledMDX> {
  runtimePromise ??= Promise.all([
    import('../vendor/satteri-wasm/runtime.js'),
    import('starter-mdx/runtime.wasm'),
  ]).then(([runtime, wasm]) => {
    runtime.initSync({ module: wasm.default })
    return runtime
  })
  const runtime = await runtimePromise
  return compiledMDX(source, runtime.mdxToHast(source))
}
