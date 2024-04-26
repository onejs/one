import { transform } from '@swc/core'
import type { BaseNode, Node, Program } from 'estree'
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
    // enforce: 'post',

    async transform(code, id, settings) {
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
            s.update(node.start, node.end + 1, replaceStr.padEnd(length - replaceStr.length))
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
          }
        }
      }

      if (s.hasChanged()) {
        return await removeUnusedImports(s)
      }
    },
  }
}

// we assume side effects are false
async function removeUnusedImports(s: MagicString): Promise<{ code: string; map?: any }> {
  // partially removes unused imports
  const output = await transform(s.toString(), {
    jsc: {
      minify: {
        compress: {
          unused: true,
        },
        mangle: true,
      },
      target: 'es2022',
    },
  })

  // removes the leftover imports
  // TODO ensure they were only ones that were previously using some sort of identifier
  const code = output.code.replaceAll(/import \'[^']+\';$/gm, '\n')

  return {
    code,
    map: output.map,
  }
}
