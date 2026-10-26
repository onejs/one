import { runInNewContext } from 'node:vm'
import { transformSync } from 'oxc-transform'
import { expect, it } from 'vitest'
import { transformMixedNativeModule } from './transformMixedNativeModule'

it.each(['probe.js', 'probe.jsx', 'probe.tsx'])(
  'preserves imported JSX component identity in mixed native %s',
  async (filename) => {
    const source = `import { View } from 'react-native';
exports.extra = 1;
export default () => <View />;`
    const result = await transformMixedNativeModule(source, filename, true)
    const View = {}
    const module = { exports: {} as any }
    const native = transformSync('native.jsx', result!.code, {
      jsx: { runtime: 'classic' },
    })
    expect(native.errors).toEqual([])
    runInNewContext(native.code, {
      module,
      exports: module.exports,
      require(name: string) {
        expect(name).toBe('react-native')
        return { View }
      },
      // the native bundler injects react; this probe only checks the view binding.
      React: { createElement: (component: unknown) => component },
    })
    expect(module.exports.default()).toBe(View)
    expect(module.exports.extra).toBe(1)
  }
)

it('ignores type-only CommonJS names while preserving runtime TypeScript references', async () => {
  const prefix = 'import { x } from "y"; '
  for (const source of [
    'type Result = { module: unknown }; export const a = x;',
    'type Result = { exports: unknown }; export const a = x;',
    'type Result = typeof module; export const a = x;',
    'type Result = typeof module.exports; export const a = x;',
    'interface Result { module: unknown; exports: typeof module.exports }; export const a = x;',
    'export const a: typeof module.exports = x;',
    'export const a = x as typeof module.exports;',
    'export const a = x as { module: unknown };',
    'export const a = x satisfies typeof module.exports;',
    'export const a = <typeof module.exports>x;',
    'export const a = x<typeof module.exports>;',
    'export function a<T extends typeof module>(value: T): typeof module.exports { return value };',
    'export class A extends x<typeof module.exports> {};',
    'namespace N { export type Result = { module: unknown }; export const a = x }; export { N };',
    'declare namespace module {}; export const a = x;',
  ]) {
    expect(
      await transformMixedNativeModule(prefix + source, 'probe.ts'),
      source
    ).toBeUndefined()
  }

  for (const source of [
    'export const actual = module.exports.initial;',
    'export const actual = exports.initial;',
    'export const actual = (module.exports.initial as number);',
    'export const actual = (<number>module.exports.initial);',
    'export const actual = (module.exports.initial satisfies number);',
    'export const actual = module!.exports.initial;',
    'const read = module.exports.read<number>; export const actual = read();',
    'export namespace N { export const value = module.exports.initial }; export const actual = N.value;',
    'export enum E { Value = module.exports.initial }; export const actual = E.Value;',
    'class Box { constructor(public value = module.exports.initial) {} }; export const actual = new Box().value;',
    'export const actual = typeof module === "object" ? 42 : 0;',
    'export const actual = typeof module.exports === "object" ? 42 : 0;',
  ]) {
    const result = await transformMixedNativeModule(prefix + source, 'probe.ts')
    expect(result, source).toBeDefined()
    const module = { exports: { initial: 42, read: () => 42 } as any }
    runInNewContext(result!.code, {
      module,
      exports: module.exports,
      require: () => ({ x: 42 }),
    })
    expect(module.exports.actual, source).toBe(42)
  }
})
