// hermes v1 can lose an awaited value in async arrows with default parameters.
// lower async after worklets, keeping bigint and the earlier class-field semantics.
// metro also emits commonjs here so it does not need a second esbuild pass.
export async function transformHermesAsync(
  code: string,
  filename: string,
  sourceMaps = false,
  format?: 'cjs'
): Promise<{ code: string; map?: any } | undefined> {
  if (!format && !code.includes('async')) return

  const { transformSync } = await import('esbuild')
  const cleanId = filename.split('?')[0]
  const result = transformSync(code, {
    loader: /\.[cm]?ts$/.test(cleanId) ? 'ts' : cleanId.endsWith('.tsx') ? 'tsx' : 'jsx',
    jsx: 'preserve',
    format,
    supported: {
      'async-await': false,
      'async-generator': false,
      'for-await': false,
    },
    sourcefile: filename,
    sourcemap: sourceMaps ? 'external' : false,
  })
  return {
    code: result.code,
    map: result.map ? JSON.parse(result.map) : undefined,
  }
}
