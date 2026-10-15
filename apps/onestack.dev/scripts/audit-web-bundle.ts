import { mkdirSync, writeFileSync } from 'node:fs'
import type { Plugin } from 'vite'

// records emitted module bytes and their importers, rather than matching bundle text
export function auditWebBundle(): Plugin {
  return {
    name: 'site-web-bundle-audit',
    generateBundle(_options, bundle) {
      const chunks = Object.values(bundle).filter((entry) => entry.type === 'chunk')
      const modules = chunks.flatMap((chunk) => Object.entries(chunk.modules).map(([id, info]) => ({
        id,
        chunk: chunk.fileName,
        renderedLength: info.renderedLength,
        importers: this.getModuleInfo(id)?.importers ?? [],
      })))
      const nativeModules = modules.filter(({ id }) => /node_modules\/(?:react-native(?:-web)?|@tamagui\/react-native-web(?:-lite)?)\//.test(id))
      const environment = this.environment.name
      mkdirSync('evidence', { recursive: true })
      writeFileSync(`evidence/bundle-${environment}.json`, JSON.stringify({environment, chunks: chunks.map(({fileName, code}) => ({fileName, bytes: Buffer.byteLength(code)})), modules, nativeModules}, null, 2))
      console.log(`[bundle audit] ${environment}: ${nativeModules.filter(m => m.renderedLength > 0).length} emitted native/web modules, ${nativeModules.reduce((sum, m) => sum + m.renderedLength, 0)} bytes`)
    },
  }
}
