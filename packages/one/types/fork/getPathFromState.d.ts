/**
 * This file is copied from the react-navigation repo:
 * https://github.com/react-navigation/react-navigation/blob/%40react-navigation/core%407.1.2/packages/core/src/getPathFromState.tsx
 *
 * Please refrain from making changes to this file, as it will make merging updates from the upstream harder.
 * All modifications except formatting should be marked with `// @modified` comment.
 */
import { type AdditionalOptions } from './getPathFromState-mods'
import type { NavigationState, PartialState } from '@react-navigation/routers'
import type { PathConfigMap } from '@react-navigation/core'
type Options<ParamList extends {}> = {
  path?: string
  initialRouteName?: string
  screens: PathConfigMap<ParamList>
} & AdditionalOptions
export type State = NavigationState | Omit<PartialState<NavigationState>, 'stale'>
/**
 * Utility to serialize a navigation state object to a path string.
 *
 * @example
 * ```js
 * getPathFromState(
 *   {
 *     routes: [
 *       {
 *         name: 'Chat',
 *         params: { author: 'Jane', id: 42 },
 *       },
 *     ],
 *   },
 *   {
 *     screens: {
 *       Chat: {
 *         path: 'chat/:author/:id',
 *         stringify: { author: author => author.toLowerCase() }
 *       }
 *     }
 *   }
 * )
 * ```
 *
 * @param state Navigation state to serialize.
 * @param options Extra options to fine-tune how to serialize the path.
 * @returns Path representing the state, e.g. /foo/bar?count=42.
 */
export declare function getPathFromState<ParamList extends {}>(
  state: State,
  options?: Options<ParamList>
): string
export declare function getPathDataFromState<ParamList extends {}>(
  state: State,
  options?: Options<ParamList>
): {
  path: string
  params: Record<string, any>
}
export default getPathFromState
//# sourceMappingURL=getPathFromState.d.ts.map
