/**
 * Functions in this file are copied from Vite `packages/vite/src/node/plugins.ts`.
 * Changes are marked with `// vxrn`.
 * Note that not all functions are copied.
 */

import type { ObjectHook } from 'rollup'
import type { HookHandler } from 'vite'

export function getHookHandler<T extends ObjectHook<Function>>(hook: T): HookHandler<T> {
  return (typeof hook === 'object' ? hook.handler : hook) as HookHandler<T>
}
