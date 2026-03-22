/**
 * Babel plugin to remove server-only code (loader, generateStaticParams) from native bundles.
 *
 * This is the Metro equivalent of clientTreeShakePlugin. It:
 * 1. Captures referenced identifiers BEFORE removing exports (critical for DCE)
 * 2. Removes server-only exports (loader, generateStaticParams)
 * 3. Re-parses the modified code and runs standalone DCE with the pre-removal references
 * 4. Adds empty stubs back to prevent "missing export" errors
 *
 * The re-parse step is necessary because babel-dead-code-elimination uses NodePath
 * identity (Set.has) which breaks when called within a babel plugin's traversal context
 * due to different NodePath instances across traversal boundaries.
 */

import type { NodePath, PluginObj } from '@babel/core'
import BabelGenerate from '@babel/generator'
import { parse } from '@babel/parser'
import BabelTraverse from '@babel/traverse'
import * as t from '@babel/types'
import {
  deadCodeElimination,
  findReferencedIdentifiers,
} from 'babel-dead-code-elimination'

const generate = (BabelGenerate['default'] ||
  BabelGenerate) as any as typeof BabelGenerate
const traverse = (BabelTraverse['default'] || BabelTraverse) as typeof BabelTraverse

const SERVER_EXPORTS = ['loader', 'generateStaticParams'] as const
type ServerExport = (typeof SERVER_EXPORTS)[number]
type PluginOptions = { routerRoot?: string }

function removeServerCodePlugin(_: unknown, options: PluginOptions): PluginObj {
  const { routerRoot = 'app' } = options

  return {
    name: 'one-remove-server-code',
    visitor: {
      Program: {
        exit(path: NodePath<t.Program>, state: { filename?: string }) {
          const filename = state.filename
          if (!filename) return

          const routerRootPattern = new RegExp(`[/\\\\]${routerRoot}[/\\\\]`)
          if (!routerRootPattern.test(filename)) return
          if (filename.includes('node_modules')) return

          const code = path.toString()
          if (!/generateStaticParams|loader/.test(code)) return

          // mirror the clientTreeShakePlugin approach exactly:
          // 1. parse fresh AST from the current code
          // 2. capture referenced identifiers BEFORE removing exports
          // 3. remove server exports
          // 4. run DCE with pre-removal references
          // 5. replace the program body
          try {
            const freshAst = parse(code, {
              sourceType: 'module',
              plugins: ['typescript', 'jsx'],
            }) as any

            // capture references BEFORE removal (critical for DCE to work)
            const referenced = findReferencedIdentifiers(freshAst)

            const removed = { loader: false, generateStaticParams: false }

            // remove server exports from the fresh AST
            traverse(freshAst, {
              ExportNamedDeclaration(expPath) {
                if (
                  expPath.node.declaration?.type === 'FunctionDeclaration' &&
                  expPath.node.declaration.id
                ) {
                  const name = expPath.node.declaration.id.name
                  if (name === 'loader' || name === 'generateStaticParams') {
                    expPath.remove()
                    removed[name] = true
                  }
                } else if (expPath.node.declaration?.type === 'VariableDeclaration') {
                  const decl = expPath.get('declaration') as NodePath<t.VariableDeclaration>
                  const declarators = decl.get('declarations')
                  // iterate in reverse so indices stay valid after removal
                  for (let i = declarators.length - 1; i >= 0; i--) {
                    const declarator = declarators[i]
                    const id = declarator.node.id
                    if (
                      id.type === 'Identifier' &&
                      (id.name === 'loader' || id.name === 'generateStaticParams')
                    ) {
                      declarator.remove()
                      removed[id.name as ServerExport] = true
                    }
                  }
                  // if all declarators were removed, clean up the empty export
                  if (
                    expPath.node.declaration?.type === 'VariableDeclaration' &&
                    expPath.node.declaration.declarations.length === 0
                  ) {
                    expPath.remove()
                  }
                }
              },
            })

            const removedFunctions = Object.keys(removed).filter(
              (key) => removed[key as keyof typeof removed]
            )

            if (removedFunctions.length === 0) return

            // run DCE with pre-removal references (same as clientTreeShakePlugin)
            deadCodeElimination(freshAst, referenced)

            // add empty stubs to prevent "missing export" errors
            if (removed.loader) {
              freshAst.program.body.push(
                t.exportNamedDeclaration(
                  t.functionDeclaration(
                    t.identifier('loader'),
                    [],
                    t.blockStatement([
                      t.returnStatement(t.stringLiteral('__vxrn__loader__')),
                    ])
                  )
                )
              )
            }
            if (removed.generateStaticParams) {
              freshAst.program.body.push(
                t.exportNamedDeclaration(
                  t.functionDeclaration(
                    t.identifier('generateStaticParams'),
                    [],
                    t.blockStatement([])
                  )
                )
              )
            }

            // generate cleaned code and re-parse to get proper NodePaths for babel
            const out = generate(freshAst, { retainLines: true })
            const finalAst = parse(out.code, {
              sourceType: 'module',
              plugins: ['typescript', 'jsx'],
            }) as any

            path.node.body = finalAst.program.body
            path.node.directives = finalAst.program.directives

            if (process.env.DEBUG) {
              console.info(
                ` 🧹 [one/metro] ${filename} removed ${removedFunctions.length} server-only exports`
              )
            }
          } catch (error) {
            console.warn(
              `[one/metro] Tree shaking failed for ${filename}:`,
              error instanceof Error ? error.message : String(error)
            )
          }
        },
      },
    },
  }
}

export default removeServerCodePlugin
