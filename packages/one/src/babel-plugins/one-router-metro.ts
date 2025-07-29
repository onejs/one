import type { NodePath } from '@babel/core'
import * as t from '@babel/types'

type PluginOptions = {
  ONE_ROUTER_APP_ROOT_RELATIVE_TO_ENTRY?: string
  ONE_ROUTER_ROOT_FOLDER_NAME?: string
  ONE_ROUTER_REQUIRE_CONTEXT_REGEX_STRING?: string
}

function oneRouterMetroPlugin(_: any, options: PluginOptions) {
  function isFirstInAssign(path: NodePath<t.MemberExpression>) {
    return t.isAssignmentExpression(path.parent) && path.parent.left === path.node
  }

  const {
    ONE_ROUTER_APP_ROOT_RELATIVE_TO_ENTRY,
    ONE_ROUTER_ROOT_FOLDER_NAME,
    ONE_ROUTER_REQUIRE_CONTEXT_REGEX_STRING,
  } = options

  if (!ONE_ROUTER_APP_ROOT_RELATIVE_TO_ENTRY) {
    throw new Error(
      `[one/babel-plugin-one-router-metro] Must provide option: ONE_ROUTER_APP_ROOT_RELATIVE_TO_ENTRY`
    )
  }
  if (!ONE_ROUTER_ROOT_FOLDER_NAME) {
    throw new Error(
      `[one/babel-plugin-one-router-metro] Must provide option: ONE_ROUTER_ROOT_FOLDER_NAME`
    )
  }
  if (!ONE_ROUTER_REQUIRE_CONTEXT_REGEX_STRING) {
    throw new Error(
      `[one/babel-plugin-one-router-metro] Must provide option: ONE_ROUTER_REQUIRE_CONTEXT_REGEX_STRING`
    )
  }

  return {
    name: 'one-router-metro',
    visitor: {
      MemberExpression(path: any, state: any) {
        if (path.get('object').matchesPattern('process.env')) {
          const key = path.toComputedKey()
          if (t.isStringLiteral(key) && !isFirstInAssign(path)) {
            if (key.value.startsWith('ONE_ROUTER_APP_ROOT_RELATIVE_TO_ENTRY')) {
              path.replaceWith(t.stringLiteral(ONE_ROUTER_APP_ROOT_RELATIVE_TO_ENTRY))
            } else if (key.value.startsWith('ONE_ROUTER_ROOT_FOLDER_NAME')) {
              path.replaceWith(t.stringLiteral(ONE_ROUTER_ROOT_FOLDER_NAME))
            } else if (key.value.startsWith('ONE_ROUTER_REQUIRE_CONTEXT_REGEX')) {
              path.replaceWith(t.regExpLiteral(ONE_ROUTER_REQUIRE_CONTEXT_REGEX_STRING))
            }
          }
        }
      },
    },
  }
}

export default oneRouterMetroPlugin
