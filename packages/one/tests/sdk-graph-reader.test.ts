import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, expect, it, vi } from 'vitest'

const cache = vi.hoisted(() => ({ root: '' }))
vi.mock('node:os', async (original) => ({
  ...(await original<typeof import('node:os')>()),
  homedir: () => cache.root,
}))
vi.mock('node:child_process', async (original) => ({
  ...(await original<typeof import('node:child_process')>()),
  execFileSync: () => 'test-version\n',
}))

import { loadGraph } from '../codegen/sdk/graph'

cache.root = mkdtempSync(join(tmpdir(), 'one-sdk-graph-'))
afterAll(() => rmSync(cache.root, { recursive: true, force: true }))

it('reads complete symbols and filters simulator-only symbols and their relationships', () => {
  const simulator = join(cache.root, '.cache/one/sdk-graphs/test-version')
  const device = `${simulator}-iphoneos`
  mkdirSync(simulator, { recursive: true })
  mkdirSync(device, { recursive: true })
  const keep = {
    kind: { identifier: 'swift.struct' }, identifier: { precise: 'keep' },
    pathComponents: ['Keep'], names: { title: 'Keep' }, accessLevel: 'public',
    docComment: { lines: [{ text: 'é "symbols": [ { \\ } ]' }] },
  }
  const drop = { ...keep, identifier: { precise: 'drop' }, pathComponents: ['Drop'] }
  const relationships = [
    { kind: 'conformsTo', source: 'keep', target: 'other' },
    { kind: 'conformsTo', source: 'drop', target: 'other' },
    { kind: 'conformsTo', source: 'other', target: 'drop' },
  ]
  const file = 'Example.symbols.json'
  writeFileSync(join(simulator, file), JSON.stringify({ metadata: { symbols: [{ ignored: true }] }, symbols: [keep, drop], relationships }))
  writeFileSync(join(device, file), JSON.stringify({ relationships: [], symbols: [keep] }))
  expect(loadGraph('Example')).toEqual({ module: 'Example', symbols: [keep], relationships: [relationships[0]] })
  writeFileSync(join(device, file), JSON.stringify({ symbols: [], relationships: [] }))
  expect(loadGraph('Example')).toEqual({ module: 'Example', symbols: [keep, drop], relationships })
  writeFileSync(join(device, file), '{"symbols":[],"relationships":[]')
  expect(() => loadGraph('Example')).toThrow(SyntaxError)
  writeFileSync(join(device, file), '{')
  expect(() => loadGraph('Example')).toThrow(SyntaxError)
})
