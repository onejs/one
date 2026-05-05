// install-error-handlers — protects `one`'s CLI long-running commands
// (build, dev, serve) from a class of catastrophic process zombies.
//
// background: 2026-05-05 the soot CI runner accumulated four `Onejs:build`
// processes pegged at 100% CPU for 3-9 days each. all of them were stuck
// inside V8's stack-trace formatter. the chain:
//
//   1. build code throws an uncaught exception
//   2. one's CLI handler runs `console.error(err?.message || err)`. when
//      `err.message` is empty, the fallback prints the Error object itself.
//   3. console.error invokes node's inspector formatter, which reads
//      `error.stack`. that getter calls Error.prepareStackTrace.
//   4. Error.prepareStackTrace was set by source-map-support (a transitive
//      dep of esbuild-register, vite, etc.). its formatter has no recursion
//      guard — if wrapCallSite or any frame-string operation throws (very
//      possible under disk/memory pressure during fs.readFileSync of source
//      maps), the resulting error's own stack getter triggers the same
//      formatter again. V8 spins in c++ trying to format the new error,
//      never yields to the JS event loop, never processes SIGTERM.
//   5. node's CLI was also missing process.exit(1) in the handler, so even
//      a clean uncaught exception left the process alive holding cpu/memory.
//
// what we install:
//
//   • installPrepareStackTraceGuard() — wraps Error.prepareStackTrace via a
//     property descriptor with a getter/setter. the getter always hands back
//     a re-entry guarded wrapper; the setter captures whatever a library
//     wants to use as the formatter. if that user-formatter throws or is
//     called recursively, we bail to a default format. this stops the V8
//     spin-loop dead even if a buggy formatter ships with a transitive dep.
//   • installSafeUncaughtHandler(label) — drop-in replacement for the
//     existing `process.on('uncaughtException', ...)` calls. always exits
//     after logging so a fatal error becomes a fast non-zero exit instead
//     of a permanent 100%-cpu zombie.
//   • formatErrorSafely(err) — lower-level helper used inside the handler.
//     temporarily zeroes Error.prepareStackTrace so `err.stack` reads use
//     V8's default formatter, even on ancient node versions where our
//     getter/setter ride-along somehow gets clobbered.

type StackPrepare = (error: Error, stack: NodeJS.CallSite[]) => string

let userPrepare: StackPrepare | undefined
let depth = 0
// prior userPrepare values, paired with the wrapper they were displaced by.
// keeps the React-style save/zero/restore pattern working: saving the wrapper,
// setting Error.prepareStackTrace = undefined, then setting it back to the
// saved wrapper restores the right userPrepare.
const restoreTrail: Array<StackPrepare | undefined> = []

function defaultFormat(error: Error, stack: NodeJS.CallSite[]): string {
  const name = error?.name ?? 'Error'
  const message = error?.message ?? ''
  const head = `${name}: ${message}`
  try {
    const lines = stack.map((frame) => {
      try {
        return `    at ${frame}`
      } catch {
        return '    at <frame>'
      }
    })
    return `${head}\n${lines.join('\n')}`
  } catch {
    return head
  }
}

function guardedPrepare(error: Error, stack: NodeJS.CallSite[]): string {
  if (depth > 0) return defaultFormat(error, stack)
  if (typeof userPrepare !== 'function') return defaultFormat(error, stack)
  depth++
  try {
    return userPrepare(error, stack)
  } catch {
    return defaultFormat(error, stack)
  } finally {
    depth--
  }
}

let installed = false

export function installPrepareStackTraceGuard(): void {
  if (installed) return
  installed = true

  const existing = Error.prepareStackTrace
  if (typeof existing === 'function' && existing !== guardedPrepare) {
    userPrepare = existing as StackPrepare
  }

  Object.defineProperty(Error, 'prepareStackTrace', {
    configurable: true,
    get(): StackPrepare {
      return guardedPrepare
    },
    set(value: unknown): void {
      if (value === guardedPrepare) {
        // restore-after-save round-trip. pop the matching userPrepare so
        // libraries that read → set undefined → set back to the saved value
        // end up with their original formatter still installed.
        if (restoreTrail.length > 0) {
          userPrepare = restoreTrail.pop()
        }
        return
      }
      restoreTrail.push(userPrepare)
      userPrepare = typeof value === 'function' ? (value as StackPrepare) : undefined
    },
  })
}

// reads err.stack with Error.prepareStackTrace temporarily zeroed so a
// broken user-formatter can't recurse on us — even if installPrepareStackTrace-
// Guard isn't active for some reason. used inside our uncaught handlers.
export function formatErrorSafely(err: unknown): string {
  const prevPrepare = Error.prepareStackTrace
  // setting to undefined makes V8 use its built-in default stack format on
  // err.stack reads. node's @types declare prepareStackTrace as a function,
  // so cast through unknown to express the runtime allowance.
  Error.prepareStackTrace = undefined as unknown as typeof Error.prepareStackTrace
  try {
    if (err instanceof Error) {
      let stack = ''
      try {
        stack = err.stack ?? ''
      } catch {
        // nothing
      }
      if (stack) return stack
      const name = err.name || 'Error'
      const message = err.message || ''
      return `${name}: ${message}`
    }
    return String(err)
  } catch {
    try {
      return String(err)
    } catch {
      return '<unprintable error>'
    }
  } finally {
    Error.prepareStackTrace = prevPrepare
  }
}

// drop-in replacement for `process.on('uncaughtException', console.error)`
// patterns. `label` distinguishes which command emitted the failure — useful
// when grepping CI logs across build/dev/serve. always exits (1) — a leaked
// uncaught is what produced the 9-day Onejs:build zombies.
export function installSafeUncaughtHandler(label: string): void {
  installPrepareStackTraceGuard()
  process.on('uncaughtException', (err) => {
    try {
      const formatted = formatErrorSafely(err)
      process.stderr.write(`[${label}] uncaught exception\n${formatted}\n`)
    } catch {
      // last-resort: never throw out of an uncaught handler
    }
    process.exit(1)
  })
  process.on('unhandledRejection', (reason) => {
    try {
      const formatted = formatErrorSafely(reason)
      process.stderr.write(`[${label}] unhandled rejection\n${formatted}\n`)
    } catch {
      // nothing
    }
    // unhandledRejection alone shouldn't kill long-running dev servers; only
    // the build/serve callers that need fail-fast pass exitOnRejection.
  })
}
