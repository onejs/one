/**
 * Transform code to Hermes-compatible output.
 * Uses SWC to downlevel class expressions and private fields
 * that Hermes (hermesc 0.14.x) doesn't support.
 * SWC is preferred over babel here because it inlines helpers
 * rather than adding require() calls, avoiding collisions with
 * rolldown's runtime module names.
 */
export async function transformForHermes(code: string): Promise<string> {
  const swc = await import('@swc/core')
  const result = await swc.transform(code, {
    jsc: {
      parser: {
        syntax: 'ecmascript',
      },
      target: 'es5',
      // only transform what hermes can't handle
      transform: {},
    },
    // keep the code readable
    minify: false,
    sourceMaps: false,
  })
  return result.code
}
