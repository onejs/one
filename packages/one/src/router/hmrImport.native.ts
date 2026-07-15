/**
 * Native HMR re-import.
 *
 * vxrn's native dev runtime re-registers the edited module into
 * `globalThis.__rolldown_runtime__` before One evicts its route cache, so the
 * fresh exports can be pulled straight from the runtime — no dynamic `import()`
 * (which Hermes cannot parse). Falls back to a rejected promise when the runtime
 * isn't present (e.g. production), so `resolve()` keeps the memoized module.
 */
export function hmrImport(path: string): Promise<any> {
  const runtime = (globalThis as any).__rolldown_runtime__
  if (!runtime || typeof runtime.loadExports !== 'function') {
    return Promise.reject(new Error('HMR import not supported on native'))
  }
  // route paths arrive as `./foo.tsx` / `/foo.tsx`; rolldown ids are bare (`foo.tsx`)
  const id = String(path).replace(/^\.\//, '').replace(/^\//, '')
  try {
    const mod = runtime.loadExports(id)
    if (mod == null) {
      return Promise.reject(new Error(`no exports for ${id}`))
    }
    return Promise.resolve(mod)
  } catch (error) {
    return Promise.reject(error)
  }
}
