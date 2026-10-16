import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createServer } from 'vite'
import { expect, it } from 'vitest'
import { autoDepOptimizePlugin } from './autoDepOptimizePlugin'

it.each([
  { external: 'external-dep', rootBundled: false, exclude: [] },
  { external: 'external-dep/feature', rootBundled: true, exclude: [] },
  { external: 'external-dep', rootBundled: false, exclude: ['internal-dep'] },
  {
    external: 'external-dep',
    rootBundled: false,
    exclude: [/some-pattern/, 'internal-dep'],
  },
])(
  'keeps SSR external $external and exclusions $exclude outside prebundling',
  async ({ external, rootBundled, exclude }) => {
    const root = realpathSync(mkdtempSync(join(tmpdir(), 'vxrn-ssr-external-')))
    const bundled = new Set<string>()
    const names = ['external-dep', 'external-dep-extra', 'internal-dep']
    writeFileSync(
      join(root, 'package.json'),
      JSON.stringify({
        private: true,
        dependencies: Object.fromEntries(names.map((name) => [name, '1.0.0'])),
      })
    )
    for (const name of names) {
      const folder = join(root, 'node_modules', name)
      mkdirSync(folder, { recursive: true })
      writeFileSync(
        join(folder, 'package.json'),
        JSON.stringify({
          name,
          version: '1.0.0',
          type: 'module',
          peerDependencies: { react: '*' },
          exports: {
            '.': { import: './index.js' },
            './feature': { import: './feature.js' },
          },
        })
      )
      writeFileSync(join(folder, 'index.js'), 'export const value = 1')
      writeFileSync(join(folder, 'feature.js'), 'export const value = 2')
    }
    writeFileSync(
      join(root, 'entry.js'),
      `import { value as external } from 'external-dep'
import { value as feature } from 'external-dep/feature'
import { value as sibling } from 'external-dep-extra'
import { value as internal } from 'internal-dep'
export const value = external + feature + sibling + internal
`
    )
    const server = await createServer({
      root,
      configFile: false,
      server: { middlewareMode: true },
      optimizeDeps: { noDiscovery: true },
      ssr: { external: [external] },
      plugins: [autoDepOptimizePlugin({ root, exclude })],
      environments: {
        ssr: {
          optimizeDeps: {
            noDiscovery: true,
            rolldownOptions: {
              plugins: [
                {
                  name: 'record-prebundled-packages',
                  load(id) {
                    if (id.startsWith(join(root, 'node_modules'))) bundled.add(id)
                  },
                },
              ],
            },
          },
        },
      },
    })
    try {
      await server.environments.ssr.listen(server)
      expect((await server.ssrLoadModule(join(root, 'entry.js'))).value).toBe(5)
      expect(bundled.has(join(root, 'node_modules/internal-dep/index.js'))).toBe(
        !exclude.includes('internal-dep')
      )
      expect(bundled.has(join(root, 'node_modules/external-dep-extra/index.js'))).toBe(
        true
      )
      expect(bundled.has(join(root, 'node_modules/external-dep/index.js'))).toBe(
        rootBundled
      )
      expect(bundled.has(join(root, 'node_modules/external-dep/feature.js'))).toBe(false)
    } finally {
      await server.close()
      rmSync(root, { recursive: true, force: true })
    }
  }
)
