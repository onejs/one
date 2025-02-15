import BabelGenerate from '@babel/generator'
import { parse } from '@babel/parser'
import BabelTraverse from '@babel/traverse'
import { deadCodeElimination, findReferencedIdentifiers } from 'babel-dead-code-elimination'
import { extname, relative } from 'node:path'
import type { Plugin } from 'vite'
import { EMPTY_LOADER_STRING } from '../constants'

const traverse = BabelTraverse['default'] as typeof BabelTraverse
const generate = BabelGenerate['default'] as any as typeof BabelGenerate

export const clientTreeShakePlugin = (): Plugin => {
  return {
    name: 'one-client-tree-shake',

    enforce: 'pre',

    applyToEnvironment(env) {
      return env.name === 'client' || env.name === 'ios' || env.name === 'android'
    },

    transform: {
      order: 'pre',
      async handler(code, id, settings) {
        if (this.environment.name === 'ssr') {
          return
        }
        if (!/\.(js|jsx|ts|tsx)/.test(extname(id))) {
          return
        }
        if (/node_modules/.test(id)) {
          return
        }

        const out = await transformTreeShakeClient(code, id)

        return out
      },
    },
  } satisfies Plugin
}

export async function transformTreeShakeClient(code: string, id: string) {
  if (!/generateStaticParams|loader/.test(code)) {
    return
  }

  // `as any` because babel-dead-code-elimination using @types and it conflicts :/
  const ast = parse(code, { sourceType: 'module', plugins: ['typescript', 'jsx'] }) as any

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
            const declaration = path.get('declaration.declarations.' + index)
            if (!Array.isArray(declaration)) {
              declaration.remove()
              removed[declarator.id.name] = true
            }
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
      removedFunctions
        .map((key) => {
          if (key === 'loader') {
            return EMPTY_LOADER_STRING
          }

          return `export function generateStaticParams() {};`
        })
        .join('\n')

    console.info(
      ` 🧹 [one]      ${relative(process.cwd(), id)} removed ${removedFunctions.length} server-only exports`
    )

    return {
      code: codeOut,
      map: out.map,
    }
  }
}
