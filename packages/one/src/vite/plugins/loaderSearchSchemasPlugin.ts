import { join, relative, resolve } from 'node:path'
import type { Plugin } from 'vite'
import { getSearchSchemaEntries } from '../../typed-routes/searchSchemaEntries'
import { createSearchSchemaScanner } from '../../typed-routes/searchParamSchemas'
import { getRouterRootFromOneOptions } from '../../utils/getRouterRootFromOneOptions'
import type { RouteIndex } from '../../utils/routeIndex'
import type { One } from '../types'

/**
 * Hands the search schemas that components pass to `useSearchParams(schema)` to the
 * loader of the route they render under, so the server validates the query before
 * the loader runs.
 *
 * Only server builds are touched. A route module that exports a loader and has
 * schemas in its route or layouts gets an `__oneSearchSchemas` export, a list of
 * functions that read each schema. A module with no schemas is left as it is.
 */
export function loaderSearchSchemasPlugin(
  options: One.PluginOptions,
  routeIndex: RouteIndex
): Plugin {
  const routerRoot = resolve(process.cwd(), getRouterRootFromOneOptions(options))

  return {
    name: 'one:loader-search-schemas',
    enforce: 'post',

    applyToEnvironment(environment) {
      return environment.config.consumer === 'server'
    },

    transform(code, id) {
      const file = id.split('?')[0]
      if (!file.startsWith(routerRoot) || !/\bloader\b/.test(code)) return

      const contextKey = `./${relative(routerRoot, file).replaceAll('\\', '/')}`
      const routePaths = routeIndex.getPaths()
      if (!routePaths.includes(contextKey)) return

      // a new scanner each time, so an edit to any scanned file is read again
      const { scan, exportsLoader } = createSearchSchemaScanner(process.cwd())
      if (!exportsLoader(file)) return

      const result = scan(
        getSearchSchemaEntries(routePaths, contextKey).map((key) => join(routerRoot, key))
      )
      // an edit to any of these can change which schemas the loader sees
      for (const scanned of result.files) this.addWatchFile(scanned)
      if (!result.schemas.length) return

      let imports = ''
      const reads: string[] = []
      for (const ref of result.schemas) {
        if (ref.module === file && ref.local) {
          reads.push(`() => ${ref.local}`)
          continue
        }
        const namespace = `__oneSearchModule${reads.length}`
        imports += `import * as ${namespace} from ${JSON.stringify(ref.module)};\n`
        reads.push(`() => ${namespace}[${JSON.stringify(ref.name)}]`)
      }

      return {
        code: `${code}\n${imports}export const __oneSearchSchemas = [${reads.join(', ')}];\n`,
        map: null,
      }
    },
  }
}
