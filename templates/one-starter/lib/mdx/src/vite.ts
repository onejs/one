const RUNTIME_WASM_SPECIFIER = 'starter-mdx/runtime.wasm'

export type StarterMDXVitePlugin = {
  name: string
  enforce: 'pre'
  resolveId(source: string): { id: string; external: true } | null
}

export function starterMDX(): StarterMDXVitePlugin {
  return {
    name: 'starter-mdx-worker-wasm',
    enforce: 'pre',
    resolveId(source) {
      return source === RUNTIME_WASM_SPECIFIER
        ? { id: RUNTIME_WASM_SPECIFIER, external: true }
        : null
    },
  }
}
