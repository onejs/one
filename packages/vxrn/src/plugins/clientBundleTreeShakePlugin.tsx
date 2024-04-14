import type { Node, Program } from 'estree'
import { walk } from 'estree-walker'
import MagicString from 'magic-string'
import type { Plugin } from 'vite'

interface TreeShakeTemplatePluginOptions {
  sourcemap?: boolean
}

type AcornNode<N extends Node> = N & { start: number; end: number }

export const clientBundleTreeShakePlugin = (options: TreeShakeTemplatePluginOptions) => {
  return {
    name: 'vxrn:client-tree-shake',
    enforce: 'post',
    transform(code, id) {
      if (id.includes('node_modules')) {
        return
      }
      if (!code.includes(`generateStaticParams`)) {
        return
      }

      const s = new MagicString(code)
      const codeAst = this.parse(code) as AcornNode<Program>

      walk(codeAst, {
        enter: (node) => {
          if (node.type === 'ExportNamedDeclaration' || node.type === 'VariableDeclaration') {
            let declarators = (
              'declarations' in node
                ? node.declarations
                : 'declaration' in node
                  ? [node.declaration]
                  : []
            ) as any[]

            let shouldRemove = false

            declarators.forEach((declarator) => {
              if (
                declarator.id.type === 'Identifier' &&
                declarator.id.name === 'generateStaticParams'
              ) {
                shouldRemove = true
              }
            })

            if (shouldRemove) {
              // @ts-ignore
              s.remove(node.start, node.end + 1)

              if (node.type === 'ExportNamedDeclaration') {
                // remove import declaration if it exists
                // @ts-ignore
                removeImportDeclaration(codeAst, node, s)
              }
            }
          }
        },
      })

      if (s.hasChanged()) {
        return {
          code: s.toString(),
          map: options.sourcemap ? s.generateMap({ hires: true }) : undefined,
        }
      }
    },
  } satisfies Plugin
}

function removeImportDeclaration(
  ast: Program,
  importName: string,
  magicString: MagicString
): boolean {
  for (const node of ast.body) {
    if (node.type === 'ImportDeclaration') {
      const specifier = node.specifiers.find((s) => s.local.name === importName)
      if (specifier) {
        if (node.specifiers.length > 1) {
          const specifierIndex = node.specifiers.findIndex((s) => s.local.name === importName)
          if (specifierIndex > -1) {
            magicString.remove(
              (node.specifiers[specifierIndex] as AcornNode<Node>).start,
              (node.specifiers[specifierIndex] as AcornNode<Node>).end + 1
            )
            node.specifiers.splice(specifierIndex, 1)
          }
        } else {
          magicString.remove((node as AcornNode<Node>).start, (node as AcornNode<Node>).end)
        }
        return true
      }
    }
  }
  return false
}
