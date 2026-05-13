import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { loadViteBuildOutDir } from './loadConfig'

const here = dirname(fileURLToPath(import.meta.url))
const fixture = (name: string) => join(here, '__fixtures__', name)

describe('loadViteBuildOutDir', () => {
  it("returns vite.config's build.outDir when set", async () => {
    expect(await loadViteBuildOutDir(fixture('with-outdir'))).toBe('build-out')
  })

  it('returns undefined when build.outDir is not set', async () => {
    expect(await loadViteBuildOutDir(fixture('without-outdir'))).toBeUndefined()
  })

  // Regression guard for the side-effect bug that broke spa-shell-routing
  // on CI: `loadConfigFromFile` runs the plugin chain, and `one()` has two
  // branches keyed off `IS_VXRN_CLI`. Without the env-var + globalThis save/
  // restore, the helper used to leak `__oneOptions` / `__vxrnPluginConfig__`
  // into the next `vxrn/serve` startup. Verify the helper is a no-op on the
  // ambient state.
  it('restores process.env.IS_VXRN_CLI + __oneOptions globals after the call', async () => {
    const previousEnv = process.env.IS_VXRN_CLI
    const previousOneOptions = globalThis['__oneOptions']
    const previousVxrnPluginConfig = globalThis['__vxrnPluginConfig__']
    const previousVxrnMetroOptions = globalThis['__vxrnMetroOptions__']

    await loadViteBuildOutDir(fixture('with-outdir'))

    expect(process.env.IS_VXRN_CLI).toBe(previousEnv)
    expect(globalThis['__oneOptions']).toBe(previousOneOptions)
    expect(globalThis['__vxrnPluginConfig__']).toBe(previousVxrnPluginConfig)
    expect(globalThis['__vxrnMetroOptions__']).toBe(previousVxrnMetroOptions)
  })
})
