/**
 * native HMR re-import
 *
 * vxrn's native dev runtime re-registers the edited module into
 * `globalThis.__rolldown_runtime__` before One evicts its route cache, so the
 * fresh exports can be pulled straight from the runtime without dynamic `import()`
 * (which Hermes cannot parse). Rejects when the runtime is unavailable so a
 * broken development runtime is visible instead of serving a stale route.
 */
export declare function hmrImport(path: string): Promise<any>;
//# sourceMappingURL=hmrImport.native.d.ts.map