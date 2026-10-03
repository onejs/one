import { describe, expect, it } from 'vitest'
import { transformSync } from './transformSync'

type WorkletsMetadata = { workletsPasses?: string[] }

const workletsPlugin = (marker: string) => () => ({
  name: 'worklets',
  visitor: {
    Program(_: unknown, state: { file: { metadata: WorkletsMetadata } }) {
      const passes = state.file.metadata.workletsPasses ?? []
      state.file.metadata.workletsPasses = passes
      passes.push(marker)
    },
  },
})

describe('transformSync', () => {
  it('runs an app-configured Worklets plugin only once when a preset adds another', () => {
    const result = transformSync(
      'export const value = 1',
      {
        filename: '/project/input.ts',
        babelrc: false,
        configFile: false,
        plugins: [workletsPlugin('app')],
        presets: [() => ({ plugins: [workletsPlugin('preset')] })],
      },
      {}
    )

    expect((result?.metadata as WorkletsMetadata | undefined)?.workletsPasses).toEqual([
      'app',
    ])
  })

  it('rejects the removed workletizableModules option before transforming', () => {
    expect(() =>
      transformSync(
        'export const value = 1',
        {
          filename: '/project/input.ts',
          babelrc: false,
          configFile: false,
          plugins: [[workletsPlugin('app'), { workletizableModules: ['remend'] }]],
        },
        {}
      )
    ).toThrow('use `importForwarding.moduleNames`')
  })

  it('parses the readonly Flow interfaces shipped by React Native 0.87', () => {
    const result = transformSync(
      `// @flow strict
interface Registration<TArgs> {
  readonly context: unknown;
  readonly listener: (...args: TArgs) => unknown;
}
export function readContext(registration: Registration<[]>): unknown {
  return registration.context;
}`,
      {
        filename: '/project/node_modules/react-native/EventEmitter.js',
        babelrc: false,
        configFile: false,
        presets: [require('@react-native/babel-preset')],
      },
      { hermesParser: true }
    )

    expect(result?.code).toContain('function readContext(registration)')
  })
})
