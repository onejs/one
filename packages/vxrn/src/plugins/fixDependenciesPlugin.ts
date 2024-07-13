import type { Plugin } from 'vite'

/**
 * Some fixes for known bad dependencies with Vite
 */
export function fixDependenciesPlugin(): Plugin {
  // uh this isn't runnning at all?
  return {
    name: 'vxrn:fix-dependencies-plugin',
    enforce: 'pre',

    resolveId(source, importer, options) {
      console.log('resolve', source, importer)
    },

    load(id) {
      console.log('load', id)
    },

    transform(code, id) {
      console.log('go?', id)
    },
  }
}
