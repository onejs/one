/**
 * Native stub: HMR cache-busting is not supported on native.
 * This avoids the dynamic import() syntax that Hermes cannot parse.
 */
export function hmrImport(_path: string): Promise<any> {
  // Return a rejected promise to fall back to normal import
  return Promise.reject(new Error('HMR import not supported on native'))
}
