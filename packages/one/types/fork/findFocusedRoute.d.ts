/**
 * This file is copied from the react-navigation repo:
 * https://github.com/react-navigation/react-navigation/blob/%40react-navigation/core%407.1.2/packages/core/src/findFocusedRoute.tsx
 *
 * Please refrain from making changes to this file, as it will make merging updates from the upstream harder.
 * All modifications except formatting should be marked with `// @modified` comment.
 *
 * No modifications currently, copied so we can access without importing any React Native code in Node.js environments.
 */
import type { InitialState } from '@react-navigation/routers'
export declare function findFocusedRoute(state: InitialState):
  | (Omit<
      import('@react-navigation/routers').Route<string, object | undefined>,
      'key'
    > & {
      state?: InitialState
    })
  | undefined
//# sourceMappingURL=findFocusedRoute.d.ts.map
