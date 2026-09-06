import { createRequire } from 'node:module'
import { basename, join } from 'node:path'
import MagicString from 'magic-string'
import { parseSync } from 'oxc-parser'

// this module is built to both esm and cjs. the metro transformer worker loads
// the cjs build, where `import.meta.url` is undefined and createRequire throws,
// so resolve against whichever of the two the running build actually has.
const SELF_URL: string =
  typeof __filename !== 'undefined' ? __filename : import.meta.url

// vite's normalizePath, inlined so this stays usable from the metro transformer
// worker, which must not pull vite into a worker process.
function normalizePath(id: string) {
  return id.replace(/\\/g, '/')
}

const CODEGEN_FILE_RE = /(?:NativeComponent\.[cm]?[jt]sx?$|[/\\]specs?[/\\])/

let hermesParser: any = undefined

export function getCodegen(projectRoot?: string) {
  let req: NodeRequire = createRequire(SELF_URL)
  if (projectRoot) {
    try {
      const rootReq = createRequire(join(projectRoot, 'package.json'))
      // Resolve package.json rather than bare specifier because @react-native/codegen
      // has no root exports/main entry and throws MODULE_NOT_FOUND on bare import.
      rootReq.resolve('@react-native/codegen/package.json')
      req = rootReq
    } catch {
      try {
        const rootReq = createRequire(join(projectRoot, 'package.json'))
        const rnPkg = rootReq.resolve('react-native/package.json')
        const rnReq = createRequire(rnPkg)
        rnReq.resolve('@react-native/codegen/package.json')
        req = rnReq
      } catch {
        req = createRequire(SELF_URL)
      }
    }
  }

  let FlowParser: any
  let TypeScriptParser: any
  let RNCodegen: any

  try {
    FlowParser = req('@react-native/codegen/lib/parsers/flow/parser').FlowParser
    TypeScriptParser = req(
      '@react-native/codegen/lib/parsers/typescript/parser'
    ).TypeScriptParser
    RNCodegen = req('@react-native/codegen/lib/generators/RNCodegen')
  } catch {
    FlowParser = req('@react-native/codegen/src/parsers/flow/parser').FlowParser
    TypeScriptParser = req(
      '@react-native/codegen/src/parsers/typescript/parser'
    ).TypeScriptParser
    RNCodegen = req('@react-native/codegen/src/generators/RNCodegen')
  }

  return {
    req,
    flowParser: new FlowParser(),
    typeScriptParser: new TypeScriptParser(),
    RNCodegen,
  }
}

function getHermesParser(projectRoot?: string) {
  if (hermesParser === undefined) {
    try {
      const req = projectRoot
        ? createRequire(join(projectRoot, 'package.json'))
        : createRequire(SELF_URL)
      hermesParser = req('hermes-parser')
    } catch {
      try {
        const req = createRequire(SELF_URL)
        hermesParser = req('hermes-parser')
      } catch {
        hermesParser = null
      }
    }
  }
  return hermesParser
}

function parseFile(filename: string, code: string, projectRoot?: string) {
  const { flowParser, typeScriptParser } = getCodegen(projectRoot)
  if (/\.[cm]?tsx?$/.test(filename)) {
    return typeScriptParser.parseString(code, filename)
  }
  if (/\.[cm]?jsx?$/.test(filename)) {
    return flowParser.parseString(code, filename)
  }
  throw new Error(`Unable to parse file '${filename}'. Unsupported filename extension.`)
}

function getLibraryName(filename: string): string {
  const base = basename(filename)
  const replaced = base.replace(/NativeComponent\.[cm]?[jt]sx?$/, '')
  return replaced === base ? base.replace(/\.[cm]?[jt]sx?$/, '') : replaced
}

const CODEGEN_CALL_RE = /codegenNativeComponent\s*[<(]/

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
  if (
    unwrapped?.type === 'CallExpression' &&
    (unwrapped.callee?.name === 'codegenNativeComponent' ||
      (unwrapped.callee?.type === 'Identifier' &&
        unwrapped.callee.name === 'codegenNativeComponent'))
  ) {
    return true
  }

  return false
}

function isCodegenNativeCommandsDeclaration(declaration: any): boolean {
  if (!declaration) return false

  const unwrapped = unwrapExpression(declaration)
  return (
    unwrapped?.type === 'CallExpression' &&
    (unwrapped.callee?.name === 'codegenNativeCommands' ||
      (unwrapped.callee?.type === 'Identifier' &&
        unwrapped.callee.name === 'codegenNativeCommands'))
  )
}

function parseAst(filename: string, code: string) {
  const isTS = /\.[cm]?tsx?$/.test(filename)
  try {
    const oxcResult = parseSync(filename, code, {
      lang: isTS
        ? filename.endsWith('x')
          ? 'tsx'
          : 'ts'
        : filename.endsWith('x')
          ? 'jsx'
          : 'js',
    })
    if (!oxcResult.errors || oxcResult.errors.length === 0) {
      return oxcResult.program
    }
  } catch {
    // oxc parser failed, try fallback
  }

  const hermes = getHermesParser()
  if (hermes) {
    try {
      const hermesResult = hermes.parse(code, {
        babel: true,
        flow: 'all',
        reactRuntimeTarget: '19',
        sourceFilename: filename,
      })
      return hermesResult.program
    } catch {
      // hermes failed
    }
  }

  return null
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

  const ast = parseAst(cleanId, code)
  const body = ast?.body
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

  const { RNCodegen } = getCodegen(projectRoot)
  const schema = parseFile(cleanId, code, projectRoot)
  const libraryName = getLibraryName(cleanId)
  const viewConfig = RNCodegen.generateViewConfig({
    libraryName,
    schema,
  })

  const s = new MagicString(code)

  if (commandsExport) {
    let removeEnd = commandsExport.end
    if (code[removeEnd] === '\r') removeEnd++
    if (code[removeEnd] === '\n') removeEnd++
    s.remove(commandsExport.start, removeEnd)
  }

  s.overwrite(defaultExport.start, defaultExport.end, viewConfig)

  return {
    code: s.toString(),
    map: s.generateMap({ hires: true, source: cleanId }),
  }
}
