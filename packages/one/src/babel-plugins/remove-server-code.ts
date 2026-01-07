/**
 * Babel plugin to remove server-only code (loader, generateStaticParams) from native bundles.
 *
 * This plugin transforms route files to remove server-only exports so they don't
 * get included in the native bundle. It's the Metro equivalent of clientTreeShakePlugin.
 *
 * What it does:
 * 1. Captures referenced identifiers BEFORE removing exports
 * 2. Removes `export function loader() { ... }` and `export const loader = ...`
 * 3. Removes `export function generateStaticParams() { ... }` and `export const generateStaticParams = ...`
 * 4. Runs dead code elimination to remove imports that were only used by removed functions
 * 5. Adds empty stubs back to prevent "missing export" errors
 *
 * Options:
 * - routerRoot: The router root directory (e.g., 'app'). Only files in this directory are transformed.
 */

import type { NodePath, PluginObj } from '@babel/core'
import * as t from '@babel/types'
import {
  deadCodeElimination,
  findReferencedIdentifiers,
} from 'babel-dead-code-elimination'

const SERVER_EXPORTS = ['loader', 'generateStaticParams'] as const

type ServerExport = (typeof SERVER_EXPORTS)[number]

type PluginOptions = {
  routerRoot?: string
}

function removeServerCodePlugin(_: unknown, options: PluginOptions): PluginObj {
  const { routerRoot = 'app' } = options

  return {
    name: 'one-remove-server-code',
    visitor: {
      Program: {
        enter(
          path: NodePath<t.Program>,
          state: { filename?: string; referenced?: Set<string> }
        ) {
          const filename = state.filename

          // Only process route files in the router root
          if (!filename) {
            return
          }

          // Check if file is in the router root directory
          const routerRootPattern = new RegExp(`[/\\\\]${routerRoot}[/\\\\]`)
          if (!routerRootPattern.test(filename)) {
            return
          }

          // Skip node_modules
          if (filename.includes('node_modules')) {
            return
          }

          // Quick check if file even has these exports
          const code = path.toString()
          if (!/generateStaticParams|loader/.test(code)) {
            return
          }

          // Capture referenced identifiers BEFORE removing exports
          // This is critical for dead code elimination to work
          try {
            state.referenced = findReferencedIdentifiers(path.node as any) as any
          } catch (error) {
            console.warn(
              `[one/metro] Skipping tree shaking for ${filename} due to identifier analysis error:`,
              error instanceof Error ? error.message : String(error)
            )
          }
        },

        exit(
          path: NodePath<t.Program>,
          state: { filename?: string; referenced?: Set<string> }
        ) {
          const filename = state.filename

          // Only process route files in the router root
          if (!filename) {
            return
          }

          // Check if file is in the router root directory
          const routerRootPattern = new RegExp(`[/\\\\]${routerRoot}[/\\\\]`)
          if (!routerRootPattern.test(filename)) {
            return
          }

          // Skip node_modules
          if (filename.includes('node_modules')) {
            return
          }

          // If we don't have referenced set from enter, skip
          if (!state.referenced) {
            return
          }

          const removedExports: Set<ServerExport> = new Set()

          // Find and remove server exports
          // Note: babel-preset-expo may have already transformed async functions like:
          //   export async function loader() { ... }
          // into:
          //   function _loader() { _loader = _asyncToGenerator(...); return _loader.apply(...) }
          //   export function loader() { return _loader.apply(...) }
          // So we need to handle both the original form and the transformed form
          path.traverse({
            ExportNamedDeclaration(exportPath: NodePath<t.ExportNamedDeclaration>) {
              const declaration = exportPath.node.declaration

              // Handle: export function loader() { ... }
              if (t.isFunctionDeclaration(declaration) && declaration.id) {
                const name = declaration.id.name as ServerExport
                if (SERVER_EXPORTS.includes(name)) {
                  removedExports.add(name)
                  exportPath.remove()
                }
              }
              // Handle: export const loader = async () => { ... }
              // Handle: export const loader = route.createLoader(...)
              else if (t.isVariableDeclaration(declaration)) {
                for (let i = declaration.declarations.length - 1; i >= 0; i--) {
                  const declarator = declaration.declarations[i]
                  if (t.isIdentifier(declarator.id)) {
                    const name = declarator.id.name as ServerExport
                    if (SERVER_EXPORTS.includes(name)) {
                      removedExports.add(name)

                      // Remove just this declarator
                      if (declaration.declarations.length === 1) {
                        exportPath.remove()
                      } else {
                        declaration.declarations.splice(i, 1)
                      }
                    }
                  }
                }
              }
            },

            // Also remove helper functions created by babel's async-to-generator transform
            // These are named _loader, _generateStaticParams, etc.
            FunctionDeclaration(funcPath: NodePath<t.FunctionDeclaration>) {
              if (!funcPath.node.id) return
              const name = funcPath.node.id.name
              // Check for helper functions like _loader, _generateStaticParams
              for (const serverExport of SERVER_EXPORTS) {
                if (name === `_${serverExport}`) {
                  // Verify this is indeed a babel-generated async helper
                  // by checking if it contains _asyncToGenerator
                  let isAsyncHelper = false
                  funcPath.traverse({
                    Identifier(idPath) {
                      if (idPath.node.name === '_asyncToGenerator') {
                        isAsyncHelper = true
                        idPath.stop()
                      }
                    },
                  })
                  if (isAsyncHelper) {
                    removedExports.add(serverExport)
                    funcPath.remove()
                  }
                }
              }
            },
          })

          // Only proceed if we removed something
          if (removedExports.size === 0) {
            return
          }

          // Run dead code elimination to remove imports that were only used by removed functions
          try {
            deadCodeElimination(path.node as any, state.referenced as any)
          } catch (error) {
            console.warn(
              `[one/metro] Dead code elimination failed for ${filename}:`,
              error instanceof Error ? error.message : String(error)
            )
          }

          // Add back empty stubs for removed exports to prevent "missing export" errors
          const stubs: t.Statement[] = []

          if (removedExports.has('loader')) {
            // export function loader() { return "__vxrn__loader__"; }
            stubs.push(
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

          if (removedExports.has('generateStaticParams')) {
            // export function generateStaticParams() { }
            stubs.push(
              t.exportNamedDeclaration(
                t.functionDeclaration(
                  t.identifier('generateStaticParams'),
                  [],
                  t.blockStatement([])
                )
              )
            )
          }

          // Add stubs at the end of the file
          for (const stub of stubs) {
            path.pushContainer('body', stub)
          }

          console.info(
            ` 🧹 [one/metro] ${filename} removed ${removedExports.size} server-only exports`
          )
        },
      },
    },
  }
}

export default removeServerCodePlugin
