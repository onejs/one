// See also: https://github.com/vitejs/vite/blob/v6.3.5/packages/vite/src/node/plugins/importMetaGlob.ts

import type { ConfigAPI, types } from '@babel/core'
import { dirname } from 'node:path'
import { escapePath, globSync } from 'tinyglobby'

export function transformImportMetaGlobPlugin(
  api: ConfigAPI & { types: typeof types }
): babel.PluginObj {
  const { types: t } = api

  return {
    name: 'expo-import-meta-transform',
    visitor: {
      CallExpression(path, state) {
        const callee = path.get('callee')
        if (!t.isMemberExpression(callee.node)) return

        const calleeObject = callee.get('object')
        if (Array.isArray(calleeObject)) return

        if (
          !t.isMetaProperty(calleeObject.node) ||
          calleeObject.node.meta.name !== 'import' ||
          calleeObject.node.property.name !== 'meta'
        ) {
          return
        }

        const calleeProperty = callee.get('property')
        if (Array.isArray(calleeProperty)) return

        if (!t.isIdentifier(calleeProperty.node, { name: 'glob' })) return

        const [globsNode, optionsNode] = path.node.arguments

        const globs = t.isStringLiteral(globsNode)
          ? [globsNode.value]
          : t.isArrayExpression(globsNode)
            ? globsNode.elements
                .map((el) => (el && t.isStringLiteral(el) ? el.value : undefined))
                .filter((s): s is NonNullable<typeof s> => !!s)
            : []

        const options: Record<string, string | boolean> = {}
        if (t.isObjectExpression(optionsNode)) {
          for (const prop of optionsNode.properties) {
            if (
              t.isObjectProperty(prop) &&
              (t.isIdentifier(prop.key) || t.isStringLiteral(prop.key)) &&
              (t.isStringLiteral(prop.value) || t.isBooleanLiteral(prop.value))
            ) {
              const key = t.isIdentifier(prop.key) ? prop.key.name : prop.key.value
              options[key] = prop.value.value
            }
          }
        }

        console.log('globs:', globs)
        console.log('options:', options)

        const cwd = (state.file.opts.filename && dirname(state.file.opts.filename)) || undefined
        const files = globSync(globs, {
          absolute: true,
          cwd,
          dot: options.exhaustive === true,
          expandDirectories: false,
          ignore: options.exhaustive ? [] : ['**/node_modules/**'],
        })

        console.log('files:', files)

        const properties = files.map((file) => {
          return t.objectProperty(
            t.stringLiteral(file),
            t.arrowFunctionExpression([], t.callExpression(t.import(), [t.stringLiteral(file)]))
          )
        })

        path.replaceWith(t.objectExpression(properties))
      },
    },
  }
}
