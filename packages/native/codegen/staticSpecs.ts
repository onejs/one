import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { transformSync } from 'esbuild'
import { emitViewConfig } from './emitViewConfig'

// Post-build rewrite: every dist mirror of a src spec becomes a static view
// config, so no bundler needs @react-native/babel-plugin-codegen (or any
// other codegen transform) to consume this package. src/specs stays raw:
// pod-install codegen reads it from the published package.
//
// A mirror is any dist file derived from a spec stem. tamagui-build emits
// esm/<stem>.mjs, esm/<stem>.native.js, cjs/<stem>.cjs, cjs/<stem>.native.cjs,
// and cjs/<stem>.native.js; the module format follows the directory, and a
// sourcemap is regenerated exactly where one already exists. Anything else
// about tamagui-build's layout changing fails loud below instead of silently
// shipping a mix of static and untransformed specs.

const CODEGEN_CALL_RE = /codegenNativeComponent\s*[<(]/

export function mirrorPaths(distDir: string, stem: string): string[] {
  return [
    join('esm', 'specs', `${stem}.mjs`),
    join('esm', 'specs', `${stem}.native.js`),
    join('cjs', 'specs', `${stem}.cjs`),
    join('cjs', 'specs', `${stem}.native.cjs`),
    join('cjs', 'specs', `${stem}.native.js`),
  ]
    .map((relativePath) => join(distDir, relativePath))
    .filter((path) => existsSync(path))
}

export function formatForMirror(mirrorPath: string): 'esm' | 'cjs' {
  return mirrorPath.split('/').includes('cjs') ? 'cjs' : 'esm'
}

if (import.meta.main) {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..')
  const specsDir = join(root, 'src', 'specs')
  const distDir = join(root, 'dist')
  const specs = readdirSync(specsDir)
    .filter((name) => name.endsWith('.ts'))
    .sort()
  let mirrors = 0
  for (const name of specs) {
    const specPath = join(specsDir, name)
    const staticModule = emitViewConfig(readFileSync(specPath, 'utf8'), specPath)
    if (!staticModule.includes('__INTERNAL_VIEW_CONFIG')) {
      throw new Error(`staticSpecs: ${name} produced no view config`)
    }
    if (CODEGEN_CALL_RE.test(staticModule)) {
      throw new Error(`staticSpecs: ${name} still contains a codegen call`)
    }
    const stem = basename(name, '.ts')
    const found = mirrorPaths(distDir, stem)
    if (!found.length) {
      throw new Error(
        `staticSpecs: ${name} has no dist mirror (run tamagui-build first, or the build layout changed)`
      )
    }
    for (const mirror of found) {
      const format = formatForMirror(mirror)
      const mapPath = `${mirror}.map`
      const withMap = existsSync(mapPath)
      const result = transformSync(staticModule, {
        loader: 'ts',
        format,
        sourcemap: withMap ? 'external' : false,
        sourcefile: relative(root, specPath),
        sourcesContent: true,
      })
      if (CODEGEN_CALL_RE.test(result.code)) {
        throw new Error(`staticSpecs: stripped ${relative(root, mirror)} still has a codegen call`)
      }
      let code = result.code
      if (withMap) {
        code += `${code.endsWith('\n') ? '' : '\n'}//# sourceMappingURL=${basename(mapPath)}\n`
        writeFileSync(mapPath, result.map)
      }
      writeFileSync(mirror, code)
      mirrors++
    }
  }
  console.log(`staticSpecs: ${specs.length} specs, ${mirrors} dist mirrors rewritten`)
}
