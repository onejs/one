import { transform } from '@swc/core'
import type { Node, Program } from 'estree'
import { walk } from 'estree-walker'
import MagicString from 'magic-string'
import { relative } from 'node:path'
import type { Plugin } from 'vite'
import { EMPTY_LOADER_STRING, LoaderDataCache } from './constants'

interface TreeShakeTemplatePluginOptions {
  sourcemap?: boolean
}

type AcornNode<N extends Node> = N & { start: number; end: number }

export const clientTreeShakePlugin = (options: TreeShakeTemplatePluginOptions = {}): Plugin => {
  return {
    name: 'vxrn:client-tree-shake',

    async transform(code, id, settings) {
      return await transformTreeShakeClient(code, id, settings, this.parse, '')
    },
  } satisfies Plugin
}

export async function transformTreeShakeClient(
  code: string,
  id: string,
  settings: { ssr?: boolean } | undefined,
  parse: any,
  root: string
) {
  if (settings?.ssr) return
  if (id.includes('node_modules')) return

  if (!/generateStaticParams|loader/.test(code)) {
    return
  }

  const s = new MagicString(code)
  const codeAst = parse(code) as AcornNode<Program>

  walk(codeAst, {
    enter: (node) => {
      shakeGenerateStaticParams()
      shakeLoader()

      function shakeLoader() {
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
            if (!declarator) return
            if (declarator.id?.type === 'Identifier' && declarator.id?.name === 'loader') {
              shouldRemove = true
            }
          })

          const relativeId = relative(process.cwd(), id).replace(new RegExp(`^${root}/`), './')

          let replaceStr = EMPTY_LOADER_STRING

          const loaderData = LoaderDataCache[relativeId]
          if (loaderData !== undefined) {
            replaceStr = `function loader(){ return ${JSON.stringify(loaderData)} }`
          }

          const length = node['end'] - node['start']

          if (shouldRemove) {
            // @ts-ignore
            s.update(node.start, node.end + 1, replaceStr.padEnd(length - replaceStr.length))
          }
        }
      }

      function shakeGenerateStaticParams() {
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
            if (!declarator) return
            if (
              declarator.id?.type === 'Identifier' &&
              declarator.id?.name === 'generateStaticParams'
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
    },
  })

  if (s.hasChanged()) {
    return {
      code: await removeUnusedImports(s),
      map: s.generateMap({ hires: true }),
    }
  }
}

// we assume side effects are false
// dont change anything in terms of source map

async function removeUnusedImports(s: MagicString): Promise<string> {
  // partially removes unused imports
  const output = await transform(s.toString(), {
    jsc: {
      minify: {
        mangle: false,
        compress: {
          side_effects: true,
          dead_code: true,
          drop_debugger: false,
        },
      },
      target: 'esnext',
    },
  })

  // swc assumes side effects are true and leaves the `import "x"` behind
  // we want to remove them to avoid clients importing server stuff
  // TODO ensure they were only ones that were previously using some sort of identifier
  return output.code.replaceAll(/import [\'\"][^']+[\'\"];$/gm, '\n')
}
