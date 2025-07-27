import { declare } from '@babel/helper-plugin-utils'
import * as t from '@babel/types'
import type { PluginObj } from '@babel/core'

type PluginOptions = {
  env?: Record<string, string | undefined>
}

export const importMetaEnvPlugin = declare<PluginOptions>((api, options): PluginObj => {
  api.assertVersion(7)

  return {
    name: 'import-meta-env',
    visitor: {
      MemberExpression(path) {
        const { node } = path

        const isImportMeta =
          t.isMetaProperty(node.object) &&
          node.object.meta.name === 'import' &&
          node.object.property.name === 'meta'

        // Replace import.meta.env
        if (isImportMeta && t.isIdentifier(node.property, { name: 'env' })) {
          const envEntries = Object.entries(options.env ?? {}).map(([key, value]) =>
            t.objectProperty(
              t.identifier(key),
              value === undefined ? t.identifier('undefined') : t.valueToNode(value)
            )
          )
          path.replaceWith(t.objectExpression(envEntries))
          return
        }

        // Replace import.meta.env.*
        if (
          t.isMemberExpression(node.object) &&
          t.isMetaProperty(node.object.object) &&
          node.object.object.meta.name === 'import' &&
          node.object.object.property.name === 'meta' &&
          t.isIdentifier(node.object.property, { name: 'env' })
        ) {
          const envKey = t.isIdentifier(node.property)
            ? node.property.name
            : t.isStringLiteral(node.property)
              ? node.property.value
              : null

          if (!envKey) return

          const value = options.env?.[envKey]
          path.replaceWith(value === undefined ? t.identifier('undefined') : t.valueToNode(value))
        }
      },
    },
  }
})

export default importMetaEnvPlugin
