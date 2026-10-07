import { defineConfig } from 'vite'
import { one } from 'one/vite'
import fs from 'node:fs'
import crypto from 'node:crypto'
import { transformSync } from 'esbuild'
const source = '/Users/n8/.worktrees/one-native-network-proof/packages/one/src/platform/network/index.native.ts'

export default defineConfig({ server: { port: 8097 }, plugins: [one({ native: { app: { name: 'OneBasic', ios: { bundleId: 'com.natew.oneexample' } }, bundlerOptions: { plugins: [{
  name: 'network-proof-bind-source',
  transform(code, id) {
    if (id.endsWith('/one/dist/esm/platform/network/index.native.js')) {
      const original = fs.readFileSync(source, 'utf8')
      const canonical = transformSync(original, { loader: 'ts', format: 'esm', target: 'es2020' }).code
      fs.writeFileSync('/Users/n8/Library/Logs/one-network-hook-proof/network.transpiled.js', canonical)
      fs.appendFileSync('/Users/n8/Library/Logs/one-network-hook-proof/binding.jsonl', JSON.stringify({id, source, sha256: crypto.createHash('sha256').update(original).digest('hex')})+'\n')
      return canonical.replace("../nativeError", '/Users/n8/one/packages/one/dist/esm/platform/nativeError.native.js').replace('./validate', '/Users/n8/.worktrees/one-native-network-proof/packages/one/src/platform/network/validate.ts')
    }
  }
}] } } })] })
