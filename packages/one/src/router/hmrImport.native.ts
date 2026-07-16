/**
 * native HMR re-import
 *
 * vxrn's native dev runtime re-registers the edited module into
 * `globalThis.__rolldown_runtime__` before One evicts its route cache, so the
 * fresh exports can be pulled straight from the runtime without dynamic `import()`
 * (which Hermes cannot parse). Rejects when the runtime is unavailable so a
 * broken development runtime is visible instead of serving a stale route.
 */
export function hmrImport(path: string): Promise<any> {
  const runtime = (
    globalThis as typeof globalThis & {
      __rolldown_runtime__?: { loadExports(id: string): unknown }
    }
  ).__rolldown_runtime__
  if (!runtime || typeof runtime.loadExports !== 'function') {
    return Promise.reject(new Error('HMR import not supported on native'))
  }
  // route paths arrive as `./foo.tsx` / `/foo.tsx`; rolldown ids are bare (`foo.tsx`)
  const id = path.replace(/^\.\//, '').replace(/^\//, '')
  return Promise.resolve().then(() => {
    const mod = runtime.loadExports(id)
    if (mod == null) {
      throw new Error(`no exports for ${id}`)
    }
    return mod
  })
}
