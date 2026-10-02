// Hermes before V1 cannot parse ES6 classes. Oxc lowers fields but has an
// ES2015 target floor, so classes and lexical bindings need Babel afterward.
export async function transformHermesClasses(
  code: string,
  filename: string,
  sourceMaps = false
): Promise<{ code: string; map?: any } | undefined> {
  if (!/\b(?:class(?:\s|\{)|(?:let|const)\s)/.test(code)) return
  const [
    { transformAsync },
    { default: transformClasses },
    { default: transformBlockScoping },
  ] = await Promise.all([
    import('@babel/core'),
    import('@babel/plugin-transform-classes'),
    import('@babel/plugin-transform-block-scoping'),
  ])
  const result = await transformAsync(code, {
    filename,
    babelrc: false,
    configFile: false,
    sourceMaps,
    // the caller composes stage maps itself; a file's own sourceMappingURL
    // composed here would give the stage map several sources
    // @ts-expect-error @types/babel__core omits false, which babel accepts
    inputSourceMap: false,
    parserOpts: { plugins: ['jsx'] },
    // Legacy Hermes hoists lexical names, including in class-free functions.
    // Lower block scope so minification cannot shadow parameters or constructors.
    plugins: [transformClasses, transformBlockScoping],
  })
  if (!result?.code) return
  return { code: result.code, map: result.map }
}
