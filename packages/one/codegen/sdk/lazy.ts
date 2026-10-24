import { parse } from '@babel/parser'
import { transform } from 'esbuild'
import { compactFacade } from './compact'

// keep the complete framework in one module, behind cached commonjs getters.
export async function lazyFacade(source: string, framework: string): Promise<string> {
  source = compactFacade(source)
  const file = parse(source, { sourceType: 'module', plugins: ['typescript'] })
  const names: string[] = []
  const index = (name: string) => {
    let at = names.indexOf(name)
    if (at < 0) at = names.push(name) - 1
    return at
  }
  const exports: number[] = [],
    classes: number[] = [],
    extensions: number[] = [],
    protocols: number[] = []
  const edits: { start: number; end: number; text: string }[] = []
  for (const statement of file.program.body) {
    if (statement.type === 'ExportNamedDeclaration') {
      const declaration = statement.declaration
      if (
        declaration?.type === 'ClassDeclaration' ||
        declaration?.type === 'FunctionDeclaration'
      ) {
        if (declaration.id) exports.push(index(declaration.id.name))
      } else if (declaration?.type === 'VariableDeclaration') {
        for (const variable of declaration.declarations) {
          if (variable.id.type !== 'Identifier')
            throw new Error('unsupported SDK export binding')
          exports.push(index(variable.id.name))
        }
      } else if (
        declaration &&
        declaration.type !== 'TSTypeAliasDeclaration' &&
        declaration.type !== 'TSInterfaceDeclaration'
      ) {
        throw new Error(`unsupported SDK export ${declaration.type}`)
      }
      if (statement.specifiers.length) throw new Error('unsupported SDK re-export')
      if (
        declaration &&
        !['TSTypeAliasDeclaration', 'TSInterfaceDeclaration'].includes(declaration.type)
      ) {
        edits.push({ start: statement.start!, end: declaration.start!, text: '' })
      }
    }
    if (
      statement.type !== 'ExpressionStatement' ||
      statement.expression.type !== 'CallExpression'
    )
      continue
    const call = statement.expression
    if (
      call.callee.type !== 'Identifier' ||
      !['registerSDKClass', 'registerSDKProtocol'].includes(call.callee.name)
    )
      continue
    const name = call.arguments[0]
    if (name?.type !== 'StringLiteral') throw new Error('unsupported SDK registration')
    const at = index(name.value)
    const list =
      call.callee.name === 'registerSDKProtocol'
        ? protocols
        : call.arguments[3]?.type === 'BooleanLiteral' && call.arguments[3].value
          ? extensions
          : classes
    list.push(at)
    edits.push({ start: name.start!, end: name.end!, text: `$n[${at}]` })
  }
  for (const edit of edits.sort((a, b) => b.start - a.start))
    source = source.slice(0, edit.start) + edit.text + source.slice(edit.end)
  const options = {
    minifyWhitespace: true,
    minifySyntax: true,
    minifyIdentifiers: true,
    keepNames: true,
    legalComments: 'none' as const,
  }
  exports.sort((a, b) => (names[a] < names[b] ? -1 : names[a] > names[b] ? 1 : 0))
  // one getter per binding preserves live values during cycles without repeating
  // the public names in a second commonjs export object inside the initializer.
  source = `module.exports=[${exports.map((at) => `()=>${names[at]}`).join(',')}];\n${source}`
  const compiled = await transform(source, { ...options, loader: 'ts', format: 'cjs' })
  const wrapper = `const $n=${JSON.stringify(names)};
    require('one/ios-runtime').defineSDKFramework(exports, ${JSON.stringify(framework)}, $n,
      ${JSON.stringify(exports)}, ${JSON.stringify(classes)}, ${JSON.stringify(extensions)}, ${JSON.stringify(protocols)},
      function(module,exports){${compiled.code}});`
  return (
    await transform(wrapper, {
      ...options,
      keepNames: false,
      loader: 'js',
      format: 'cjs',
    })
  ).code
}
