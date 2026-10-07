import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { runInNewContext } from 'node:vm'
import type { ResolvedConfig } from 'vite'
import { expect, it } from 'vitest'
import { buildMetroConfigInputFromViteConfig } from './getMetroConfigFromViteConfig'
import { transform } from '../transformer/metroNativeWorker'

it('classifies a binary GLB with stock Metro config and registers its identity', async () => {
  const root = await mkdtemp(join(import.meta.dirname, '.glb-metro-'))
  const bytes = Buffer.from([0x67, 0x6c, 0x54, 0x46, 2, 0, 0, 0, 0xff, 0x80, 0, 1])
  await writeFile(join(root, 'sofa.glb'), bytes)
  try {
    const { defaultConfig } = await buildMetroConfigInputFromViteConfig(
      { root } as ResolvedConfig,
      { watchman: false }
    )
    const type = defaultConfig.resolver.assetExts.includes('glb') ? 'asset' : 'module'
    const result = await transform(
      { assetRegistryPath: 'react-native/asset-registry', publicPath: '/assets' },
      root,
      'sofa.glb',
      bytes,
      { dev: true, platform: 'ios', type }
    )
    expect(result.output[0].type).toBe('js/module/asset')
    let descriptor: any
    runInNewContext(result.output[0].data.code, {
      __d: (factory: Function) =>
        factory(
          {},
          () => ({
            registerAsset: (asset: any) => {
              descriptor = asset
            },
          }),
          {},
          {},
          { exports: {} },
          {},
          [0]
        ),
    })
    expect(descriptor).toMatchObject({
      name: 'sofa',
      type: 'glb',
      scales: [1],
      httpServerLocation: '/assets',
    })
    expect(descriptor.hash).not.toBe('')
    expect(descriptor.width).toBeUndefined()
    expect(descriptor.height).toBeUndefined()
    expect(await readFile(join(root, 'sofa.glb'))).toEqual(bytes)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
