import module from 'node:module'

/**
 * Resolves a module path from the specified directory.
 * Uses Node's require.resolve semantics.
 */
export const resolvePath = (path: string, from = process.cwd()): string => {
  // For node: builtins, return as-is
  if (path.startsWith('node:')) {
    return path
  }

  const require = module.createRequire(from.endsWith('/') ? from : from + '/')
  return require.resolve(path, { paths: [from] })
}
