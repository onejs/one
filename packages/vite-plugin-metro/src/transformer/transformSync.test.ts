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
})
