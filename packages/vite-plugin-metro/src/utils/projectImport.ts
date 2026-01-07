import { createDebugger } from '@vxrn/debug'
import module from 'node:module'

export const { debug } = createDebugger('vite-metro:projectImport')

/**
 * Dynamically imports a module from the user's project root instead of this package's location.
 *
 * This avoids issues in monorepos or complex setups where dependencies like Expo or Metro
 * might be installed in nested `node_modules` directories.
 */
export async function projectImport<T = any>(
  projectRoot: string,
  path: string
): Promise<T> {
  try {
    const importPath = projectResolve(projectRoot, path)

    debug?.(`Importing "${path}" from project root: "${projectRoot}" at "${importPath}"`)

    const out = await import(importPath)

    // somewhat hacky fix but for some reason in new takeout repo its double-wrapping default export
    if (out?.default?.default) {
      return {
        ...out,
        default: out.default.default,
      }
    }

    return out
  } catch (e) {
    if (e instanceof Error) {
      e.message = `[vite-plugin-metro] Failed to import ${path} from your project (${projectRoot}): ${e.message}`
    }

    throw e
  }
}

export function projectResolve(projectRoot: string, path: string): string {
  const require = module.createRequire(projectRoot)
  const importPath = require.resolve(path, { paths: [projectRoot] })
  return importPath
}
