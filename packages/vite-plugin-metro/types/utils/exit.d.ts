type AsyncExitHook = (signal: NodeJS.Signals) => void | Promise<void>;
/** Add functions that run before the process exits. Returns a function for removing the listeners. */
export declare function installExitHooks(asyncExitHook: AsyncExitHook): () => void;
/**
 * Monitor if the current process is exiting before the delay is reached.
 * If there are active resources, the process will be forced to exit after the delay is reached.
 *
 * When invoked under a parent process that waits on stdio pipe EOF (e.g. Gradle's
 * `createBundleReleaseJsAndAssets` exec'ing this CLI), a plain process.exit() is
 * not enough — orphaned child processes can keep the inherited stdio file
 * descriptors open and the parent hangs until its own timeout. To avoid that,
 * we kill any lingering child handles before exiting so the parent sees a clean
 * EOF and proceeds immediately.
 *
 * @see https://nodejs.org/docs/latest-v18.x/api/process.html#processgetactiveresourcesinfo
 */
export declare function ensureProcessExitsAfterDelay(waitUntilExitMs?: number, startedAtMs?: number): void;
/** memoizes an async function to prevent subsequent calls that might be invoked before the function has finished resolving. */
export declare function guardAsync<V, T extends (...args: any[]) => Promise<V>>(fn: T): T;
export declare function warn(...message: string[]): void;
export {};
//# sourceMappingURL=exit.d.ts.map