/**
 * This file is copied from the react-navigation repo:
 * https://github.com/react-navigation/react-navigation/blob/%40react-navigation/core%407.1.2/packages/native/src/createMemoryHistory.tsx
 *
 * Please refrain from making changes to this file, as it will make merging updates from the upstream harder.
 * All modifications except formatting should be marked with `// @modified` comment.
 *
 * No modifications currently, copied only in order to use a custom `useLinking` function.
 */
import type { NavigationState } from '@react-navigation/core'
type HistoryRecord = {
  id: string
  state: NavigationState
  path: string
}
export declare function createMemoryHistory(): {
  readonly index: number
  get(index: number): HistoryRecord
  backIndex({ path }: { path: string }): number
  push({ path, state }: { path: string; state: NavigationState }): void
  replace({ path, state }: { path: string; state: NavigationState }): void
  go(n: number): Promise<void> | undefined
  listen(listener: () => void): () => void
}
export {}
//# sourceMappingURL=createMemoryHistory.d.ts.map
