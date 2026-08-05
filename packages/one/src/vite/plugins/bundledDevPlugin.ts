import fs from 'node:fs'
import path from 'node:path'
import type { Plugin } from 'vite'
import { virtualEntryId } from './virtualEntryConstants'

// Vite 8.1 experimental bundled dev (FullBundleDevEnvironment): a rolldown-powered
// single-bundle web client. This plugin wires up the pieces One needs to run under
// it. Enable with `one({ web: { experimentalBundledDev: true } })`. Only active in
// dev (serve); a no-op for builds and for non-web environments.
//
// Companion changes live where they're structurally required:
//   - virtualEntryPlugin: installs the react-refresh preamble into the bundled
//     client entry (the separate /@one/dev.js path can't, since /@vite/client isn't
//     a standalone module in bundled mode).
//   - fileSystemRouterPlugin: serves the bundled entry url and drops /@vite/client
//     from preloads.
//   - devtoolsPlugin: stubs /@vite/client + /@react-refresh imports in /@one/dev.js.

const MIME: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  avif: 'image/avif',
  bmp: 'image/bmp',
  ico: 'image/x-icon',
}

// rolldown's native asset handling drops default-import asset specifiers
// (`import logo from './logo.png'`) coming from raw-bundled node_modules deps under
// One's client env — the binding is elided while its usage is kept, crashing with
// "X is not defined" (e.g. @react-navigation/elements' icon Assets). transform() DOES
// run in the FullBundleDev pipeline, so rewrite those imports to inline data-uris.
//
// The same data-uri must be produced on the SERVER too: SSR otherwise emits the
// original asset URL (e.g. `<img src="/features/.../mj.jpg">`), which both 404s under
// FullBundleDev and diverges from the client's inlined data-uri → React hydration
// mismatch. So the inliner runs on client (rolldown plugin) and ssr (top-level
// transform) alike — see bundledDevPlugin().
function inlineAssetImports(code: string, id: string): { code: string; map: null } | null {
  if (!/\.(png|jpe?g|gif|webp|avif|bmp|ico)/.test(code)) return null
  const importRe =
    /import\s+(\w+)\s+from\s*['"]([^'"?]+\.(?:png|jpe?g|gif|webp|avif|bmp|ico))['"]\s*;?/g
  const base = id.split('?')[0]
  let result = code
  let changed = false
  let m: RegExpExecArray | null
  const edits: { full: string; name: string; uri: string }[] = []
  while ((m = importRe.exec(code))) {
    const [full, name, spec] = m
    const abs = spec.startsWith('.') ? path.resolve(path.dirname(base), spec) : null
    if (!abs || !fs.existsSync(abs)) continue
    const ext = path.extname(abs).slice(1).toLowerCase()
    const uri = `data:${MIME[ext] || 'application/octet-stream'};base64,${fs.readFileSync(abs).toString('base64')}`
    edits.push({ full, name, uri })
  }
  for (const e of edits) {
    result = result.replace(e.full, `const ${e.name} = ${JSON.stringify(e.uri)};`)
    changed = true
  }
  return changed ? { code: result, map: null } : null
}

function webBundledAssetPlugin() {
  return {
    name: 'one:web-bundled-asset',
    transform: (code: string, id: string) => inlineAssetImports(code, id),
  }
}

export function bundledDevPlugin(enabled: boolean): Plugin {
  return {
    name: 'one:bundled-dev',

    // mirror the client's asset inlining on the server env so SSR emits the same
    // data-uris (the rolldown client plugin above can't reach the ssr pipeline).
    transform(code, id) {
      if (!enabled) return
      const env = (this as any).environment
      if (!env || env.name !== 'ssr' || env.mode !== 'dev') return
      return inlineAssetImports(code, id)
    },

    config(_userConfig, env) {
      if (!enabled || env.command !== 'serve') return

      return {
        experimental: { bundledDev: true },
        environments: {
          client: {
            build: {
              rolldownOptions: {
                // bundle the virtual entry so FullBundleDev serves it at
                // /assets/_virtual_one-entry.js
                input: [virtualEntryId],
                plugins: [webBundledAssetPlugin()],
                experimental: {
                  // rolldown 1.1.0 defaulted lazyBarrel ON, which breaks One's
                  // index.mjs barrel re-exports under FullBundleDev (e.g. `Slot`
                  // resolves to undefined). pin it off.
                  lazyBarrel: false,
                },
                // react-native packages import native-only exports
                // (codegenNativeComponent, TurboModuleRegistry, …) from react-native
                // → aliased to react-native-web, which doesn't export them. shim as
                // undefined instead of failing the build (matches the dep optimizer).
                shimMissingExports: true,
              },
            },
          },
        },
      }
    },
  }
}
