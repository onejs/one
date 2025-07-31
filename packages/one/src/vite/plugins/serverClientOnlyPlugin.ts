import type { Plugin } from 'vite'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export function serverClientOnlyPlugin(): Plugin {
  return {
    name: 'one:server-client-only',
    enforce: 'pre',

    config() {
      return {
        resolve: {
          alias: {
            'server-only': resolve(__dirname, '../server-only.js'),
            'client-only': resolve(__dirname, '../client-only.js'),
          },
        },
      }
    },

    resolveId(source) {
      if (source === 'server-only') {
        return { id: resolve(__dirname, '../server-only.js'), external: false }
      }
      if (source === 'client-only') {
        return { id: resolve(__dirname, '../client-only.js'), external: false }
      }
      return null
    },
  }
}