import BabelGenerate from '@babel/generator'
import { parse } from '@babel/parser'
import BabelTraverse from '@babel/traverse'
import { deadCodeElimination, findReferencedIdentifiers } from 'babel-dead-code-elimination'
import { relative } from 'node:path'
import type { Plugin } from 'vite'
import { EMPTY_LOADER_STRING, LoaderDataCache } from './constants'

const traverse = BabelTraverse['default'] as typeof BabelTraverse
const generate = BabelGenerate['default'] as any as typeof BabelGenerate

export const clientTreeShakePlugin = (): Plugin => {
  return {
    name: 'vxrn:client-tree-shake',

    enforce: 'post',

    applyToEnvironment(env) {
      return env.name === 'client'
    },

    async transform(code, id, settings) {
      return await transformTreeShakeClient(code, id, settings)
    },
  } satisfies Plugin
}

export async function transformTreeShakeClient(
  code: string,
  id: string,
  settings: { ssr?: boolean } | undefined
) {
  if (settings?.ssr) return
  if (id.includes('node_modules')) return

  if (!/generateStaticParams|loader/.test(code)) {
    return
  }

  const ast = parse(code, { sourceType: 'module', plugins: ['typescript', 'jsx'] })
  const referenced = findReferencedIdentifiers(ast)

  const removed = {
    loader: false,
    generateStaticParams: false,
  }

  traverse(ast, {
    ExportNamedDeclaration(path) {
      if (path.node.declaration && path.node.declaration.type === 'FunctionDeclaration') {
        if (!path.node.declaration.id) return
        const functionName = path.node.declaration.id.name
        if (functionName === 'loader' || functionName === 'generateStaticParams') {
          path.remove()
          removed[functionName] = true
        }
      } else if (path.node.declaration && path.node.declaration.type === 'VariableDeclaration') {
        path.node.declaration.declarations.forEach((declarator, index) => {
          if (
            declarator.id.type === 'Identifier' &&
            (declarator.id.name === 'loader' || declarator.id.name === 'generateStaticParams')
          ) {
            // @ts-expect-error always one
            path.get('declaration.declarations.' + index).remove()
            removed[declarator.id.name] = true
          }
        })
      }
    },
  })

  const removedFunctions = Object.keys(removed).filter((key) => removed[key])

  if (removedFunctions.length) {
    deadCodeElimination(ast, referenced)

    const out = generate(ast)

    // add back in empty or filled loader and genparams
    const codeOut =
      out.code +
      '\n\n' +
      // TODO ideally put it back in same place as it was
      removedFunctions
        .map((key) => {
          if (key === 'loader') {
            const relativeId = relative(process.cwd(), id)
            //.replace(new RegExp(`^${root}/`), './')

            // this is only used during dev build, for prod build see replaceLoader
            const loaderData = LoaderDataCache[relativeId]
            if (loaderData !== undefined) {
              return `export function loader(){ return ${JSON.stringify(loaderData)}; }`
            }

            return EMPTY_LOADER_STRING
          }

          return `export function generateStaticParams() {};`
        })
        .join('\n')

    return {
      code: codeOut,
      map: out.map,
    }
  }
}
