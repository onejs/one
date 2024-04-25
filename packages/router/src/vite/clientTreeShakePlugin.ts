import type { Node, Program, BaseNode } from 'estree'
import { walk } from 'estree-walker'
import MagicString from 'magic-string'
import type { Plugin } from 'vite'
import { EMPTY_LOADER_STRING } from './constants'

interface TreeShakeTemplatePluginOptions {
  sourcemap?: boolean
}

type AcornNode<N extends Node> = N & { start: number; end: number }

export const clientTreeShakePlugin = (options: TreeShakeTemplatePluginOptions = {}): Plugin => {
  return {
    name: 'vxrn:client-tree-shake',
    enforce: 'post',

    transform(code, id, settings) {
      if (settings?.ssr) return
      if (id.includes('node_modules')) return

      if (!/generateStaticParams|loader/.test(code)) {
        return
      }

      const s = new MagicString(code)
      const codeAst = this.parse(code) as AcornNode<Program>

      walk(codeAst, {
        enter: (node) => {
          walkGenerateStaticParams(node)
          walkLoader(node)
        },
      })

      function walkLoader(node: BaseNode) {
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
            if (declarator.id.type === 'Identifier' && declarator.id.name === 'loader') {
              shouldRemove = true
            }
          })

          const replaceStr = EMPTY_LOADER_STRING
          const length = node['end'] - node['start']

          if (shouldRemove) {
            // @ts-ignore
            // s.remove(node.start, node.end + 1)
            s.update(node.start, node.end + 1, replaceStr.padEnd(length - replaceStr.length))

            if (node.type === 'ExportNamedDeclaration') {
              // remove import declaration if it exists
              // @ts-ignore
              removeImportDeclaration(codeAst, node, s)
            }
          }
        }
      }

      function walkGenerateStaticParams(node: BaseNode) {
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

          const replaceStr = `function generateStaticParams() {};`
          const length = node['end'] - node['start']

          if (shouldRemove) {
            // @ts-ignore
            // s.remove(node.start, node.end + 1)
            s.update(node.start, node.end + 1, replaceStr.padEnd(length - replaceStr.length))
            // make sure it doesnt error with forceExports
            // s.append(`function generateStaticParams {}`)

            if (node.type === 'ExportNamedDeclaration') {
              // remove import declaration if it exists
              // @ts-ignore
              removeImportDeclaration(codeAst, node, s)
            }
          }
        }
      }

      if (s.hasChanged()) {
        return {
          code: s.toString(),
          map: options.sourcemap ? s.generateMap({ hires: true }) : undefined,
        }
      }
    },
  }
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
