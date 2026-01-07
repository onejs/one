import type { NodePath } from '@babel/core'
import * as t from '@babel/types'
type PluginOptions = {
  ONE_ROUTER_APP_ROOT_RELATIVE_TO_ENTRY?: string
  ONE_ROUTER_ROOT_FOLDER_NAME?: string
  ONE_ROUTER_REQUIRE_CONTEXT_REGEX_STRING?: string
  ONE_SETUP_FILE_NATIVE?: string
}
declare function oneRouterMetroPlugin(
  _: any,
  options: PluginOptions
): {
  name: string
  visitor: {
    Program(path: NodePath<t.Program>, state: any): void
    MemberExpression(path: any, state: any): void
  }
}
export default oneRouterMetroPlugin
//# sourceMappingURL=one-router-metro.d.ts.map
