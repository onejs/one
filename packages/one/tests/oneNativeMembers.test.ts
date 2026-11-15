import { mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { rolldown } from 'rolldown'
import { expect, it } from 'vitest'
import { nativeOneMembers } from '../src/vite/plugins/oneNativeMembers'

it('drops unrelated SDK backends for static namespace reads and preserves escaped identities', async () => {
  const root = mkdtempSync(join(tmpdir(), 'one-native-members-'))
  try {
    const one = join(root, 'one.js')
    writeFileSync(
      join(root, 'platform-getter.js'),
      `export function currentPlatform() { return globalThis.__onePlatform ?? 'ios'; }`
    )
    writeFileSync(join(root, 'ui.js'), `export function Map() { return 'map'; }`)
    writeFileSync(
      join(root, 'calendar.js'),
      `export function Calendar() { return 'EventKit_unused'; }`
    )
    writeFileSync(
      join(root, 'platform.js'),
      `export * as UI from './ui.js'; export { Calendar } from './calendar.js';`
    )
    writeFileSync(
      one,
      `import { UI, Calendar } from './platform.js'; import { currentPlatform } from './platform-getter.js'; const merged = Object.freeze({...UI}); export const One = Object.freeze({UI: merged, Calendar, get platform() { return currentPlatform(); }}); export function original() { return One; }`
    )
    const rewrite = nativeOneMembers(one)
    for (const [name, code] of Object.entries({
      static: `import { One } from 'one'; globalThis.__oneResult = One.UI.Map();`,
      getter: `import { One } from 'one'; globalThis.__onePlatform = 'ios'; const first = One.platform; globalThis.__onePlatform = 'android'; globalThis.__oneResult = [first, One.platform];`,
      identity: `import { One, original } from 'one'; globalThis.__oneResult = One.UI.Map === original().UI.Map;`,
      shadow: `import { One } from 'one'; function local(One) { return One.UI.Map(); } globalThis.__oneResult = [One.UI.Map(), local({ UI: { Map: () => 'shadow' } })];`,
    })) {
      const input = join(root, `${name}.js`)
      writeFileSync(input, code)
      const bundle = await rolldown({
        input,
        plugins: [
          {
            name: 'one-members',
            resolveId(source) {
              if (source === 'one') return { id: one, moduleSideEffects: false }
            },
            transform(source, id) {
              if (id === realpathSync(input)) return rewrite(source, id)
            },
          },
        ],
      })
      const { output } = await bundle.generate({ format: 'iife', minify: true })
      await bundle.close()
      const result = output[0] as { code: string }
      if (name === 'static' || name === 'getter')
        expect(result.code).not.toContain('EventKit_unused')
      new Function(result.code)()
      expect((globalThis as any).__oneResult).toEqual(
        name === 'static'
          ? 'map'
          : name === 'identity'
            ? true
            : name === 'getter'
              ? ['ios', 'android']
              : ['map', 'shadow']
      )
    }
  } finally {
    delete (globalThis as any).__oneResult
    delete (globalThis as any).__onePlatform
    rmSync(root, { recursive: true, force: true })
  }
})
