import remapping from '@jridgewell/remapping'
import { generate } from 'astring'
import { parse, SimpleTraverser, Transforms } from 'hermes-parser'
import MagicString from 'magic-string'

export async function stripFlowTypes(id: string, code: string, sourceMaps = true) {
  // swc represents flow enums as typescript enums. hermes owns their distinct
  // runtime semantics; lower only those declarations before native stripping.
  const edited = new MagicString(code)
  if (/\benum\b/.test(code)) {
    const program = parse(code, { flow: 'all', sourceType: 'module' })
    SimpleTraverser.traverse(program, {
      enter(node, parent) {
        if (node.type !== 'EnumDeclaration') return
        const declaration = parent?.type === 'ExportDefaultDeclaration' ? parent : node
        const [start, end] = declaration.range
        const lowered = Transforms.transformEnumSyntax(
          { ...program, body: [declaration] },
          {}
        )
        edited.overwrite(start, end, generate(lowered).trimEnd())
      },
      leave() {},
    })
  }
  const { transform } = await import('@swc/core')
  const result = await transform(edited.toString(), {
    filename: id,
    swcrc: false,
    configFile: false,
    inputSourceMap: false,
    sourceMaps,
    jsc: {
      target: 'esnext',
      parser: {
        syntax: 'flow',
        all: true,
        jsx: true,
        enums: true,
        components: true,
        patternMatching: true,
      },
      transform: { react: { runtime: 'preserve' } },
    },
  })
  const map = result.map ? JSON.parse(result.map) : undefined
  return {
    code: result.code,
    map:
      map && edited.hasChanged()
        ? remapping(
            [
              map,
              edited.generateMap({
                source: id,
                includeContent: true,
                hires: true,
              }),
            ],
            () => null
          )
        : map,
  }
}
