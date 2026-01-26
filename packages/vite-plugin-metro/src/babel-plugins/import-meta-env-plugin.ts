import { declare } from '@babel/helper-plugin-utils'
import * as t from '@babel/types'
import type { PluginObj } from '@babel/core'
import { getPlatformEnv, metroPlatformToViteEnvironment } from '../env/platformEnv'

type PluginOptions = {
  env?: Record<string, string | boolean | undefined>
}

/**
 * Babel plugin to replace `import.meta.env` and `import.meta.env.*` with env values.
 *
 * Platform-specific env vars (VITE_ENVIRONMENT, VITE_NATIVE, EXPO_OS, TAMAGUI_ENVIRONMENT)
 * are automatically injected based on the babel caller's platform.
 *
 * This plugin is referenced by name since Metro runs transformers in separate workers:
 * '@vxrn/vite-plugin-metro/babel-plugins/import-meta-env-plugin'
 */
export const importMetaEnvPlugin = declare<PluginOptions>((api, options): PluginObj => {
  api.assertVersion(7)

  const platform = api.caller((caller) => (caller as any)?.platform) as
    | string
    | null
    | undefined
  const platformEnv = getPlatformEnv(metroPlatformToViteEnvironment(platform))

  // Platform env is authoritative and cannot be overridden
  const env: Record<string, string | boolean | undefined> = {
    ...options.env,
    ...platformEnv,
  }

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
          const envEntries = Object.entries(env).map(([key, value]) =>
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

          const value = env[envKey]
          path.replaceWith(
            value === undefined ? t.identifier('undefined') : t.valueToNode(value)
          )
        }
      },
    },
  }
})

export default importMetaEnvPlugin
