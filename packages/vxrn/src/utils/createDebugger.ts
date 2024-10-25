import debug from 'debug'

interface DebuggerOptions {
  onlyWhenFocused?: boolean | string
}

export type VxrnDebugScope = `vxrn:${string}`

const DEBUG = process.env.DEBUG

/**
 * This is like `createDebugger()` in the Vite source code ([see](https://github.com/vitejs/vite/blob/v6.0.0-beta.5/packages/vite/src/node/utils.ts#L163)),
 * but some of its features are not supported yet to keeps things simple.
 */
export function createDebugger(
  namespace: VxrnDebugScope | undefined,
  options: DebuggerOptions = {}
): (debug.Debugger['log'] & { namespace: VxrnDebugScope }) | undefined {
  if (!namespace) return

  const log = debug(namespace)
  const { onlyWhenFocused } = options

  let enabled = log.enabled
  if (enabled && onlyWhenFocused) {
    const ns = typeof onlyWhenFocused === 'string' ? onlyWhenFocused : namespace
    enabled = !!DEBUG?.includes(ns)
  }

  // Not supported for now
  const filter = undefined

  if (enabled) {
    const fn = (...args: [string, ...any[]]) => {
      if (!filter || args.some((a) => a?.includes?.(filter))) {
        log(...args)
      }
    }

    fn.namespace = namespace

    return fn
  }
}
