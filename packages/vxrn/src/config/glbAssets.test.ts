import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { join, relative } from 'node:path'
import { runInNewContext } from 'node:vm'
import { tmpdir } from 'node:os'
import { build, createServer } from 'vite'
import { expect, it } from 'vitest'
import { getBaseViteConfig } from './getBaseViteConfigOnly'
import { DEFAULT_ASSET_EXTS } from '../constants/defaults'
import { reactNativeDevAssetPlugin } from '../plugins/reactNativeDevAssetPlugin'
import { getNativeAssetContentType } from '../plugins/reactNativeDevServer'
import {
  buildNativeBundle,
  createNativeDevAssetRegistry,
  createNativeDevEngine,
  getNativeAssetData,
} from '../utils/createNativeDevEngine'

// a valid gltf 2 binary with a json chunk and binary payload.
function glbFixture() {
  const json = Buffer.from(
    JSON.stringify({ asset: { version: '2.0' }, buffers: [{ byteLength: 4 }] }).padEnd(
      80,
      ' '
    )
  )
  const header = Buffer.alloc(20)
  header.write('glTF')
  header.writeUInt32LE(2, 4)
  header.writeUInt32LE(20 + json.length + 12, 8)
  header.writeUInt32LE(json.length, 12)
  header.writeUInt32LE(0x4e4f534a, 16)
  const bin = Buffer.from([4, 0, 0, 0, 0x42, 0x49, 0x4e, 0, 0xff, 0, 0x80, 1])
  return Buffer.concat([header, json, bin])
}

it('imports GLB as a web URL and preserves emitted binary bytes', async () => {
  const root = await mkdtemp(join(import.meta.dirname, '.glb-web-'))
  const bytes = glbFixture()
  await writeFile(join(root, 'sofa.glb'), bytes)
  await writeFile(
    join(root, 'entry.js'),
    "import model from './sofa.glb'; globalThis.model = model"
  )
  const config = await getBaseViteConfig({ root, mode: 'development' })
  const server = await createServer({
    ...config,
    root,
    configFile: false,
    server: { port: 0, host: '127.0.0.1' },
  })
  try {
    await server.listen()
    const address = server.httpServer!.address() as { port: number }
    const origin = `http://127.0.0.1:${address.port}`
    const imported = await fetch(`${origin}/sofa.glb?import`)
    expect(imported.status).toBe(200)
    expect(await imported.text()).toContain('export default "/sofa.glb"')
    const asset = await fetch(`${origin}/sofa.glb`)
    expect(asset.headers.get('content-type')).toBe('model/gltf-binary')
    expect(Buffer.from(await asset.arrayBuffer())).toEqual(bytes)
    const result: any = await build({
      ...config,
      root,
      configFile: false,
      logLevel: 'silent',
      build: {
        write: false,
        assetsInlineLimit: 0,
        rolldownOptions: { input: join(root, 'entry.js') },
      },
    })
    const emitted = result.output.find(
      (output: any) => output.type === 'asset' && output.fileName.endsWith('.glb')
    )
    expect(Buffer.from(emitted.source)).toEqual(bytes)
    expect(result.output.find((output: any) => output.type === 'chunk').code).toContain(
      emitted.fileName
    )
  } finally {
    await server.close()
    await rm(root, { recursive: true, force: true })
  }
})

it.each(['ios', 'android'] as const)(
  'registers GLB and copies release bytes on %s',
  async (platform) => {
    const root = await mkdtemp(join(tmpdir(), 'vxrn-glb-native-'))
    const bytes = glbFixture()
    await mkdir(join(root, 'models'))
    await mkdir(join(root, 'node_modules/react-native/src'), { recursive: true })
    await writeFile(
      join(root, 'node_modules/react-native/package.json'),
      JSON.stringify({
        name: 'react-native',
        exports: { './asset-registry': './src/asset-registry.js' },
      })
    )
    await writeFile(
      join(root, 'node_modules/react-native/src/asset-registry.js'),
      'const assets = []; export function registerAsset(asset) { return assets.push(asset) }; export function getAssetByID(id) { return assets[id - 1] }'
    )
    const file = join(root, 'models/sofa.glb')
    await writeFile(file, bytes)
    await writeFile(
      join(root, 'entry.js'),
      "import model from './models/sofa.glb'; import { getAssetByID } from 'react-native/asset-registry'; globalThis.model = getAssetByID(model)"
    )
    try {
      const result = await buildNativeBundle({
        root,
        entryFile: 'entry.js',
        platform,
        assetsDest: join(root, 'output'),
      })
      const context: any = { console }
      runInNewContext(result.code, context)
      const registered = context.model
      expect(registered).toMatchObject({ name: 'sofa', type: 'glb', scales: [1] })
      expect(registered.width).toBeUndefined()
      expect(registered.height).toBeUndefined()
      const data = await getNativeAssetData(file, root, platform)
      expect(registered.hash).toBe(data.hash)
      const registry = createNativeDevAssetRegistry()
      registry.register(registered)
      const devAsset = registry.resolve(
        `${registered.httpServerLocation}/sofa.glb`,
        registered.hash
      )!
      expect(await readFile(devAsset.filePath)).toEqual(bytes)
      expect(
        registry.resolve(`${registered.httpServerLocation}/sofa.glb`, 'stale')
      ).toBeUndefined()
      expect(getNativeAssetContentType(devAsset.type)).toBe('model/gltf-binary')
      const native = await createNativeDevEngine({
        root,
        port: 0,
        platform,
        plugins: [
          {
            name: 'glb-fixture-entry',
            transform(_code, id) {
              if (id.endsWith('/__virtual-native-entry.tsx')) return "import './entry.js'"
            },
          },
        ],
      })
      try {
        await native.getBundle()
        const served = native.getAsset(
          `${registered.httpServerLocation}/sofa.glb`,
          registered.hash
        )!
        expect(await readFile(served.filePath)).toEqual(bytes)
        expect(served.hash).toBe(registered.hash)
        expect(served.type).toBe('glb')
      } finally {
        await native.close()
      }
      const copied = platform === 'ios' ? 'assets/models/sofa.glb' : 'raw/models_sofa.glb'
      expect(await readFile(join(root, 'output', copied))).toEqual(bytes)

      const plugin = reactNativeDevAssetPlugin({
        assetExts: DEFAULT_ASSET_EXTS,
        mode: 'prod',
        assetsDest: join(root, 'legacy-output'),
      })
      ;(plugin.configResolved as Function)({ root })
      const code = await (plugin.load as Function).call(
        { environment: { name: platform } },
        file
      )
      expect(code).toContain('AssetRegistry.registerAsset')
      expect(await readFile(join(root, 'legacy-output/assets/models/sofa.glb'))).toEqual(
        bytes
      )
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  }
)

it('serves legacy native dev GLB bytes with their content type', async () => {
  const root = await mkdtemp(join(import.meta.dirname, '.glb-dev-'))
  const file = join(root, 'sofa.glb')
  const bytes = glbFixture()
  await writeFile(file, bytes)
  const plugin = reactNativeDevAssetPlugin({ assetExts: DEFAULT_ASSET_EXTS, mode: 'dev' })
  let middleware: Function
  ;(plugin.configResolved as Function)({ root: process.cwd() })
  ;(plugin.configureServer as Function)({
    config: {
      logger: {
        error: (error: string) => {
          throw new Error(error)
        },
      },
    },
    middlewares: {
      use: (handler: Function) => {
        middleware = handler
      },
    },
  })
  const headers: Record<string, string> = {}
  let served: Buffer | undefined
  try {
    await middleware!(
      { url: `/__vxrn_dev_native_assets/${relative(process.cwd(), file)}` },
      {
        setHeader: (name: string, value: string) => {
          headers[name] = value
        },
        write: (value: Buffer) => {
          served = value
        },
        end() {},
      },
      () => {
        throw new Error('asset request not handled')
      }
    )
    expect(served).toEqual(bytes)
    expect(headers['content-type']).toBe('model/gltf-binary')
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
