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
      React: { createElement: (component: unknown) => component },
    })
    expect(module.exports.default()).toBe(View)
    expect(module.exports.extra).toBe(1)
  }
)
