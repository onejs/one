import MagicString from 'magic-string'
import {
  generateViewConfig,
  parseSpec,
  renderViewConfigModule,
} from './reactNativeViewConfig'

// vite's normalizePath, inlined so this stays usable from the metro transformer
// worker, which must not pull vite into a worker process.
function normalizePath(id: string) {
  return id.replace(/\\/g, '/')
}

const CODEGEN_FILE_RE = /(?:NativeComponent\.[cm]?[jt]sx?$|[/\\]specs?[/\\])/
const CODEGEN_CALL_RE = /codegenNativeComponent\s*[<(]/

// oxc reports positions as start/end, hermes-parser (the flow specs) as range
const startOf = (node: any): number => node.start ?? node.range[0]
const endOf = (node: any): number => node.end ?? node.range[1]

function unwrapExpression(node: any): any {
  while (node) {
    if (
      node.type === 'TSAsExpression' ||
      node.type === 'TSSatisfiesExpression' ||
      node.type === 'TSTypeAssertion' ||
      node.type === 'TypeCastExpression' ||
      node.type === 'AsExpression' ||
      node.type === 'ParenthesizedExpression'
    ) {
      node = node.expression
    } else if (
      node.type === 'SequenceExpression' &&
      Array.isArray(node.expressions) &&
      node.expressions.length > 0
    ) {
      node = node.expressions[node.expressions.length - 1]
    } else {
      break
    }
  }
  return node
}

function isCodegenDeclaration(declaration: any): boolean {
  if (!declaration) return false

  if (
    declaration.left &&
    declaration.left.left &&
    declaration.left.left.name === 'codegenNativeComponent'
  ) {
    return true
  }

  const unwrapped = unwrapExpression(declaration)
  return (
    unwrapped?.type === 'CallExpression' &&
    unwrapped.callee?.type === 'Identifier' &&
    unwrapped.callee.name === 'codegenNativeComponent'
  )
}

function isCodegenNativeCommandsDeclaration(declaration: any): boolean {
  if (!declaration) return false
  const unwrapped = unwrapExpression(declaration)
  return (
    unwrapped?.type === 'CallExpression' &&
    unwrapped.callee?.type === 'Identifier' &&
    unwrapped.callee.name === 'codegenNativeCommands'
  )
}

export function transformReactNativeCodegen(
  code: string,
  id: string,
  projectRoot?: string
): { code: string; map: any } | null | undefined {
  const cleanId = normalizePath(id.split('?')[0])

  if (!CODEGEN_FILE_RE.test(cleanId)) {
    return
  }

  // the transform runs more than once over the same module, so it must not
  // reject the output it just produced. matching the bare name matches the
  // surviving `import codegenNativeComponent from ...` too; only a remaining
  // CALL means the file still needs generating. a comment marker cannot do
  // this job because oxc drops leading comments on the next pass.
  if (!CODEGEN_CALL_RE.test(code)) {
    return
  }

  const program = parseSpec(code, cleanId, projectRoot)
  const body = program?.body
  if (!body) {
    return
  }

  let defaultExport: any = null
  let commandsExport: any = null

  for (const node of body) {
    if (node.type === 'ExportDefaultDeclaration') {
      if (isCodegenDeclaration(node.declaration)) {
        defaultExport = node
      }
    } else if (node.type === 'ExportNamedDeclaration') {
      if (node.declaration && node.declaration.declarations) {
        const firstDeclaration = node.declaration.declarations[0]
        if (firstDeclaration?.type === 'VariableDeclarator') {
          const isValidCommandsExport = isCodegenNativeCommandsDeclaration(
            firstDeclaration.init
          )

          if (isValidCommandsExport) {
            if (
              firstDeclaration.id?.type === 'Identifier' &&
              firstDeclaration.id.name !== 'Commands'
            ) {
              throw new Error("Native commands must be exported with the name 'Commands'")
            }
            commandsExport = node
          } else {
            if (
              firstDeclaration.id?.type === 'Identifier' &&
              firstDeclaration.id.name === 'Commands'
            ) {
              throw new Error(
                "'Commands' is a reserved export and may only be used to export the result of codegenNativeCommands."
              )
            }
          }
        }
      } else if (node.specifiers && node.specifiers.length > 0) {
        for (const specifier of node.specifiers) {
          if (
            specifier.type === 'ExportSpecifier' &&
            ((specifier.local?.type === 'Identifier' &&
              specifier.local.name === 'Commands') ||
              (specifier.exported?.type === 'Identifier' &&
                specifier.exported.name === 'Commands'))
          ) {
            throw new Error(
              "'Commands' is a reserved export and may only be used to export the result of codegenNativeCommands."
            )
          }
        }
      }
    }
  }

  if (!defaultExport) {
    return
  }

  const generated = generateViewConfig(program)
  if (!generated) {
    return
  }

  const s = new MagicString(code)

  if (commandsExport) {
    let removeEnd = endOf(commandsExport)
    if (code[removeEnd] === '\r') removeEnd++
    if (code[removeEnd] === '\n') removeEnd++
    s.remove(startOf(commandsExport), removeEnd)
  }

  s.overwrite(
    startOf(defaultExport),
    endOf(defaultExport),
    renderViewConfigModule(generated)
  )

  return {
    code: s.toString(),
    map: s.generateMap({ hires: true, source: cleanId }),
  }
}
