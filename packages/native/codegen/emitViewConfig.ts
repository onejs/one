import { createRequire } from 'node:module'
import { basename } from 'node:path'
import { parseSync } from '@babel/core'
import generate from '@babel/generator'

// Static view-config emission: byte-identical output to
// @react-native/babel-plugin-codegen, run in our own build instead of the
// bundler. Same parser, same @react-native/codegen schema builder, same
// printer; only the splice is ours. The parity test pins the bytes against
// the real plugin over every src spec, so the two can only drift together
// (a shared printer or generator upgrade), never apart.

// @react-native/codegen ships source and lib layouts depending on how it was
// installed; the babel plugin requires source first and falls back to lib,
// so this does the same.
const require = createRequire(import.meta.url)
let TypeScriptParser: any
let RNCodegen: any
try {
  TypeScriptParser = require('@react-native/codegen/src/parsers/typescript/parser')
    .TypeScriptParser
  RNCodegen = require('@react-native/codegen/src/generators/RNCodegen')
} catch {
  TypeScriptParser = require('@react-native/codegen/lib/parsers/typescript/parser')
    .TypeScriptParser
  RNCodegen = require('@react-native/codegen/lib/generators/RNCodegen')
}
const typeScriptParser = new TypeScriptParser()

type Node = any

// The plugin matches a default export whose callee is codegenNativeComponent
// through coverage counters, casts, and TS assertions; replicate every branch.
function isCodegenDeclaration(declaration: Node): boolean {
  if (!declaration) return false
  if (
    declaration.left &&
    declaration.left.left &&
    declaration.left.left.name === 'codegenNativeComponent'
  ) {
    return true
  } else if (
    declaration.callee &&
    declaration.callee.name &&
    declaration.callee.name === 'codegenNativeComponent'
  ) {
    return true
  } else if (
    (declaration.type === 'TypeCastExpression' || declaration.type === 'AsExpression') &&
    declaration.expression &&
    declaration.expression.callee &&
    declaration.expression.callee.name &&
    declaration.expression.callee.name === 'codegenNativeComponent'
  ) {
    return true
  } else if (
    declaration.type === 'TSAsExpression' &&
    declaration.expression &&
    declaration.expression.callee &&
    declaration.expression.callee.name &&
    declaration.expression.callee.name === 'codegenNativeComponent'
  ) {
    return true
  }
  return false
}

function isCodegenNativeCommandsDeclaration(declaration: Node): boolean {
  if (!declaration) return false
  if (
    declaration.type === 'CallExpression' &&
    declaration.callee &&
    declaration.callee.type === 'Identifier' &&
    declaration.callee.name === 'codegenNativeCommands'
  ) {
    return true
  }
  if (declaration.type === 'SequenceExpression' && declaration.expressions) {
    return isCodegenNativeCommandsDeclaration(
      declaration.expressions[declaration.expressions.length - 1]
    )
  }
  if (
    (declaration.type === 'TypeCastExpression' || declaration.type === 'AsExpression') &&
    declaration.expression &&
    declaration.expression.type === 'CallExpression' &&
    declaration.expression.callee &&
    declaration.expression.callee.type === 'Identifier' &&
    declaration.expression.callee.name === 'codegenNativeCommands'
  ) {
    return true
  }
  if (
    declaration.type === 'TSAsExpression' &&
    declaration.expression &&
    declaration.expression.type === 'CallExpression' &&
    declaration.expression.callee &&
    declaration.expression.callee.type === 'Identifier' &&
    declaration.expression.callee.name === 'codegenNativeCommands'
  ) {
    return true
  }
  return false
}

// The plugin points every generated node at the default export's location so
// errors in generated code blame the closest source equivalent. Locations do
// not affect printed bytes, but replicate the pass for fidelity.
function remapLocs(node: Node, loc: unknown, start: number, end: number): void {
  if (!node || typeof node !== 'object') return
  if (node.loc) {
    node.loc = loc
    node.start = start
    node.end = end
  }
  for (const key of Object.keys(node)) {
    if (key === 'loc' || key === 'leadingComments' || key === 'trailingComments') continue
    const child = node[key]
    if (Array.isArray(child)) {
      for (const entry of child) remapLocs(entry, loc, start, end)
    } else {
      remapLocs(child, loc, start, end)
    }
  }
}

// TurboModule specs live in src/specs for pod-install and gradle codegen but
// carry no view: the babel plugin passes them through untouched, and so does
// everything downstream of emitViewConfig.
export function isViewSpecFile(name: string): boolean {
  return !name.endsWith('NativeModule.ts')
}

export function emitViewConfig(source: string, filename: string): string {
  const file = parseSync(source, {
    filename,
    parserOpts: { plugins: ['typescript'] },
    babelrc: false,
    configFile: false,
  }) as any
  const body: Node[] = file?.program?.body ?? []
  let defaultExport: Node = null
  let commandsExport: Node = null
  for (const node of body) {
    if (node.type === 'ExportDefaultDeclaration') {
      if (isCodegenDeclaration(node.declaration)) defaultExport = node
    } else if (node.type === 'ExportNamedDeclaration') {
      if (node.declaration?.declarations?.[0]) {
        const firstDeclaration = node.declaration.declarations[0]
        if (firstDeclaration.type === 'VariableDeclarator') {
          if (isCodegenNativeCommandsDeclaration(firstDeclaration.init)) {
            if (
              firstDeclaration.id?.type === 'Identifier' &&
              firstDeclaration.id.name !== 'Commands'
            ) {
              throw new Error("Native commands must be exported with the name 'Commands'")
            }
            commandsExport = node
          } else if (
            firstDeclaration.id?.type === 'Identifier' &&
            firstDeclaration.id.name === 'Commands'
          ) {
            throw new Error(
              "'Commands' is a reserved export and may only be used to export the result of codegenNativeCommands."
            )
          }
        }
      } else if (node.specifiers?.length) {
        for (const specifier of node.specifiers) {
          if (
            specifier.type === 'ExportSpecifier' &&
            specifier.local?.type === 'Identifier' &&
            specifier.local.name === 'Commands'
          ) {
            throw new Error(
              "'Commands' is a reserved export and may only be used to export the result of codegenNativeCommands."
            )
          }
        }
      }
    }
  }
  // The plugin silently skips files without a codegen export; a build step over
  // known specs fails loud instead, since a missing export is a broken recipe.
  if (!defaultExport) {
    throw new Error(
      `emitViewConfig: ${filename} has no codegenNativeComponent default export`
    )
  }
  const schema = typeScriptParser.parseString(source)
  const libraryName = basename(filename).replace(/NativeComponent\.(js|ts)$/, '')
  const viewConfig = RNCodegen.generateViewConfig({ libraryName, schema })
  const generated = parseSync(viewConfig, {
    babelrc: false,
    browserslistConfigFile: false,
    configFile: false,
  }) as any
  remapLocs(generated.program, defaultExport.loc, defaultExport.start, defaultExport.end)
  file.program.body = body.flatMap((node: Node) =>
    node === defaultExport ? generated.program.body : node === commandsExport ? [] : [node]
  )
  return generate(file, {}, source).code
}
