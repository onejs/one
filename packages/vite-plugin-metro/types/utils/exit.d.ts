type AsyncExitHook = (signal: NodeJS.Signals) => void | Promise<void>
/** Add functions that run before the process exits. Returns a function for removing the listeners. */
export declare function installExitHooks(asyncExitHook: AsyncExitHook): () => void
/**
 * Monitor if the current process is exiting before the delay is reached.
 * If there are active resources, the process will be forced to exit after the delay is reached.
 *
 * @see https://nodejs.org/docs/latest-v18.x/api/process.html#processgetactiveresourcesinfo
 */
export declare function ensureProcessExitsAfterDelay(
  waitUntilExitMs?: number,
  startedAtMs?: number
): void
/** memoizes an async function to prevent subsequent calls that might be invoked before the function has finished resolving. */
export declare function guardAsync<V, T extends (...args: any[]) => Promise<V>>(fn: T): T
export declare function warn(...message: string[]): void
export {}
//# sourceMappingURL=exit.d.ts.map
