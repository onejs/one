import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { compiledMDX, extractFrontmatter } from './serverShared'
import type { CompiledMDX } from './types'

let runtimePromise:
  | Promise<typeof import('../vendor/satteri-wasm/runtime.js')>
  | undefined

export { extractFrontmatter }

export async function compileMDX(source: string): Promise<CompiledMDX> {
  runtimePromise ??= import('../vendor/satteri-wasm/runtime.js').then(async (runtime) => {
    const wasmURL = import.meta.resolve('starter-mdx/runtime.wasm')
    runtime.initSync({ module: await readFile(fileURLToPath(wasmURL)) })
    return runtime
  })
  const runtime = await runtimePromise
  return compiledMDX(source, runtime.mdxToHast(source))
}
