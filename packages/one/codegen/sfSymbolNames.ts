// refreshes src/platform/generated/sfSymbolNames.ts from the installed SF Symbols app.
// the generated union is committed: CI has no SF Symbols.app, and generate.ts does
// not rewrite this file. run: bun codegen/sfSymbolNames.ts

import { execFileSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const SF_SYMBOL_PUBLIC_TYPE = 'SFSymbolName'

const app = '/Applications/SF Symbols.app'
const plist = `${app}/Contents/Resources/Metadata/name_availability.plist`
const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const output = join(root, 'src/platform/generated/sfSymbolNames.ts')

const namePattern = /^[A-Za-z0-9.]+$/

export function readSymbolNames(): { version: string; names: string[] } {
  const version = execFileSync(
    'plutil',
    ['-extract', 'CFBundleShortVersionString', 'raw', `${app}/Contents/Info.plist`],
    { encoding: 'utf8' }
  ).trim()
  const catalog = JSON.parse(
    execFileSync('plutil', ['-convert', 'json', '-o', '-', plist], {
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    })
  ) as { symbols?: Record<string, string> }
  const symbols = catalog.symbols
  if (!symbols || typeof symbols !== 'object') {
    throw new Error('name_availability.plist has no symbols dictionary')
  }
  const names = Object.keys(symbols).sort()
  if (names.length < 1000) throw new Error(`SF Symbol catalog is too small: ${names.length}`)
  for (const name of names) {
    if (!namePattern.test(name)) throw new Error(`SF Symbol name is not a plain token: ${name}`)
  }
  const unique = new Set(names)
  if (unique.size !== names.length) throw new Error('SF Symbol catalog has duplicate names')
  return { version, names }
}

export function renderSymbolNames(version: string, names: readonly string[]): string {
  return `// generated from SF Symbols ${version} name_availability.plist by codegen/sfSymbolNames.ts.
// refresh with: bun codegen/sfSymbolNames.ts
// do not edit.

export type SFSymbolName =
${names.map((name) => `  | '${name}'`).join('\n')}
`
}

if (import.meta.main) {
  const { version, names } = readSymbolNames()
  writeFileSync(output, renderSymbolNames(version, names))
  console.log(`wrote ${names.length} SF Symbol names from SF Symbols ${version}`)
}
