import { resolve as importMetaResolve } from 'import-meta-resolve'

export const resolveFile = (path: string) => {
  try {
    return importMetaResolve(path, import.meta.url).replace('file://', '')
  } catch(err) {
    if (typeof require === 'undefined') {
      throw err
    }
    return require.resolve(path)
  }
}
