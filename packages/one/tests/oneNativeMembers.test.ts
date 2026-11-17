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
      join(root, 'open.js'),
      `function openSettings() { return 'settings'; } export const Open = Object.freeze({ openSettings });`
    )
    writeFileSync(
      join(root, 'platform.js'),
      `export * as UI from './ui.js'; export { Calendar } from './calendar.js'; import { Open } from './open'; export { Open }; globalThis.__oneBarrel = true;`
    )
    writeFileSync(
      one,
      `import { UI, Calendar, Open } from './platform.js'; import { currentPlatform } from './platform-getter.js'; const merged = Object.freeze({...UI}); export const One = Object.freeze({UI: merged, Calendar, openSettings: Open.openSettings, get platform() { return currentPlatform(); }}); export function original() { return One; }`
    )
    const rewrite = nativeOneMembers(one)
    for (const [name, code] of Object.entries({
      static: `import { One } from 'one'; globalThis.__oneResult = One.UI.Map();`,
      settings: `import { One } from 'one'; globalThis.__oneResult = One.openSettings();`,
      alias: `import { One } from 'one'; const UI = One.UI; globalThis.__oneResult = UI.Map();`,
      defaultParam: `import { One } from 'one'; function f(map = One.UI.Map) { return map(); } globalThis.__oneResult = f();`,
      shadowedAlias: `import { One } from 'one'; const UI = One.UI; function f({ map = UI.Map } = {}) { return map(); } function g(UI) { return UI; } globalThis.__oneResult = [f(), g(1)];`,
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
      if (['static', 'alias', 'settings', 'getter', 'defaultParam'].includes(name))
        expect(result.code).not.toContain('EventKit_unused')
      delete (globalThis as any).__oneBarrel
      new Function(result.code)()
      // reads resolve past the barrel to the module defining them
      if (['static', 'alias', 'settings', 'defaultParam'].includes(name))
        expect((globalThis as any).__oneBarrel).toBeUndefined()
      expect((globalThis as any).__oneResult).toEqual(
        name === 'static' || name === 'alias' || name === 'defaultParam'
          ? 'map'
          : name === 'shadowedAlias'
            ? ['map', 1]
            : name === 'settings'
              ? 'settings'
              : name === 'identity'
                ? true
                : name === 'getter'
                  ? ['ios', 'android']
                  : ['map', 'shadow']
      )
    }
    // every read is either rewritten or reported, so linking never drops a reached framework
    for (const [file, code] of Object.entries({
      'key.js': `import { One } from 'one'; const c = {}; c[One.Calendar] = 1;`,
      'update.js': `import { One } from 'one'; const c = {}; c[One.Calendar]++;`,
      'pattern.js': `import { One } from 'one'; let g; [g = One.Calendar] = [];`,
      'namespace.ts': `import { One } from 'one'; namespace N { export const g = One.Calendar; }`,
      'enum.ts': `import { One } from 'one'; enum E { A = One.Calendar.length }`,
      'reexport.js': `export * as Lib from 'one';`,
      'template.js': 'export const one = import(`one`);',
      'tag.jsx': `import { One } from 'one'; const UI = One.UI; export const a = <UI />;`,
    })) {
      const escapes: string[] = []
      const result = rewrite(code, join(root, file), (reason) => escapes.push(reason))
      expect(
        escapes.length > 0 || !/One\.Calendar/.test(result?.code ?? code),
        file
      ).toBe(true)
    }
  } finally {
    delete (globalThis as any).__oneResult
    delete (globalThis as any).__onePlatform
    delete (globalThis as any).__oneBarrel
    rmSync(root, { recursive: true, force: true })
  }
})
