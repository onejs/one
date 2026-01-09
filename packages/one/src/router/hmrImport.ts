/**
 * Dynamic import with cache-busting for HMR.
 * Native uses hmrImport.native.ts which stubs this out since Hermes cannot parse import().
 */
export function hmrImport(path: string): Promise<any> {
  return import(/* @vite-ignore */ `${path}?t=${Date.now()}`)
}
