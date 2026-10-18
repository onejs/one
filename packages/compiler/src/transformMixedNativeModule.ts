// metro lowers esm before evaluating commonjs assignments. preserve that order
// for mixed native sources so module.exports can replace the entire export object.
export async function transformMixedNativeModule(
  code: string,
  filename: string,
  sourceMaps = false
): Promise<{ code: string; map?: any } | undefined> {
  if (!/\b(?:module|exports)\b/.test(code) || !/\b(?:import|export)\b/.test(code)) return

  const { parseAsync, traverse, transformFromAstAsync } = await import('@babel/core')
  const ast = await parseAsync(code, {
    filename,
    babelrc: false,
    configFile: false,
    sourceType: 'unambiguous',
    parserOpts: { plugins: ['typescript', 'jsx'] },
  })
  if (!ast || !ast.program.body.some((node) => /^(?:Import|Export)/.test(node.type)))
    return

  let mixed = false
  traverse(ast, {
    MemberExpression(path) {
      const { object, property, computed } = path.node
      if (object.type !== 'Identifier' || path.scope.hasBinding(object.name)) return
      if (
        object.name === 'exports' ||
        (object.name === 'module' &&
          ((!computed && property.type === 'Identifier' && property.name === 'exports') ||
            (computed &&
              property.type === 'StringLiteral' &&
              property.value === 'exports')))
      ) {
        mixed = true
      }
    },
  })
  if (!mixed) return

  const { default: commonjs } = await import('@babel/plugin-transform-modules-commonjs')
  const plugins: any[] = [commonjs]
  if (/\.[cm]?tsx?$/.test(filename)) {
    const { default: typescript } = await import('@babel/plugin-transform-typescript')
    plugins.unshift([
      typescript,
      {
        allowDeclareFields: true,
        allowNamespaces: true,
        isTSX: filename.endsWith('.tsx'),
      },
    ])
  }
  const result = await transformFromAstAsync(ast, code, {
    filename,
    babelrc: false,
    configFile: false,
    sourceMaps,
    sourceFileName: filename,
    plugins,
  })
  return { code: result!.code!, map: result!.map ?? undefined }
}
