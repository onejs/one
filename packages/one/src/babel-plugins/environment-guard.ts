/**
 * babel plugin for native (metro) builds that enforces environment guard imports.
 *
 * in native builds, `native-only` imports are allowed (removed as no-ops),
 * while `server-only`, `client-only`, and `web-only` imports are replaced
 * with a throw statement.
 */

import type { PluginObj } from '@babel/core'
import * as t from '@babel/types'

const GUARD_SPECIFIERS = [
  'server-only',
  'client-only',
  'native-only',
  'web-only',
] as const

type GuardSpecifier = (typeof GUARD_SPECIFIERS)[number]

// native builds allow native-only, forbid the rest
const ALLOWED_IN_NATIVE: readonly GuardSpecifier[] = ['native-only']

function environmentGuardBabelPlugin(_: unknown): PluginObj {
  return {
    name: 'one-environment-guard',
    visitor: {
      ImportDeclaration(path) {
        const source = path.node.source.value as GuardSpecifier
        if (!GUARD_SPECIFIERS.includes(source)) return

        if (ALLOWED_IN_NATIVE.includes(source)) {
          // allowed — remove the import (it's a side-effect-only guard)
          path.remove()
        } else {
          // forbidden — replace with throw
          path.replaceWith(
            t.throwStatement(
              t.newExpression(t.identifier('Error'), [
                t.stringLiteral(`${source} cannot be imported in a native environment`),
              ])
            )
          )
        }
      },
    },
  }
}

export default environmentGuardBabelPlugin
