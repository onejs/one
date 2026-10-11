// hermes before v1 cannot parse classes. swc lowers the complete hierarchy
// together with lexical bindings after oxc's field and syntax transforms.
export async function transformHermesClasses(
  code: string,
  filename: string,
  sourceMaps = false
): Promise<{ code: string; map?: any } | undefined> {
  if (!/\b(?:class(?:\s|\{)|(?:let|const)\s)/.test(code)) return
  const { transform } = await import('@swc/core')
  const result = await transform(code, {
    filename,
    swcrc: false,
    configFile: false,
    sourceMaps,
    // the caller composes stage maps itself; a file's own sourceMappingURL
    // composed here would give the stage map several sources
    inputSourceMap: false,
    isModule: 'unknown',
    jsc: {
      parser: { syntax: 'ecmascript', jsx: true },
      transform: { react: { runtime: 'preserve' } },
    },
    env: { include: ['transform-classes', 'transform-block-scoping'] },
  })
  if (!result?.code) return
  return {
    code: result.code,
    map: result.map ? JSON.parse(result.map) : undefined,
  }
}
