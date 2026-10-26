import { expect, test } from 'bun:test'
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { createRequire } from 'node:module'
import { join, resolve } from 'node:path'
import { build } from 'esbuild'

const one = resolve(import.meta.dir, '../packages/one')

// run after packages/one's build: only packed bytes enter the consumer graph.
test('packed iOS backends resolve shipped facades under native consumer conditions', async () => {
  const consumer = mkdtempSync(join(tmpdir(), 'one-ios-exports-'))
  try {
    const installed = join(consumer, 'node_modules/one')
    mkdirSync(installed, { recursive: true })
    const archive = join(consumer, 'one.tgz')
    execFileSync('bun', ['pm', 'pack', '--filename', archive], {
      cwd: one,
      stdio: 'pipe',
    })
    execFileSync('tar', ['-xzf', archive, '-C', installed, '--strip-components=1'])
    writeFileSync(join(consumer, 'package.json'), '{"type":"module"}')

    const platform = join(installed, 'dist/esm/platform')
    const backends = readdirSync(platform, { recursive: true }).filter(
      (name): name is string =>
        typeof name === 'string' && /backend\.(ios|sdk\.native)\.js$/.test(name)
    )
    expect(backends).toEqual(
      expect.arrayContaining([
        'app-info/backend.ios.js',
        'device/backend.ios.js',
        'app-icon/backend.ios.js',
        'share/backend.ios.js',
        'local-authentication/backend.ios.js',
        'keep-awake/backend.ios.js',
        'contacts/backend.sdk.native.js',
      ])
    )
    const result = await build({
      stdin: {
        contents: backends
          .map(
            (name, i) =>
              `export * as backend${i} from ${JSON.stringify(join(platform, name))}`
          )
          .join('\n'),
        resolveDir: consumer,
      },
      bundle: true,
      write: false,
      format: 'esm',
      platform: 'browser',
      conditions: ['react-native', 'import', 'require'],
      mainFields: ['react-native', 'module', 'main'],
      resolveExtensions: [
        '.ios.tsx',
        '.ios.ts',
        '.ios.jsx',
        '.ios.js',
        '.native.tsx',
        '.native.ts',
        '.native.jsx',
        '.native.js',
        '.tsx',
        '.ts',
        '.jsx',
        '.js',
        '.mjs',
        '.json',
      ],
      // platform host dependencies only; all one/ios/* and one/ios-runtime
      // imports must resolve and compile from the archive, without plugins.
      external: ['react', 'react-native', 'react-native-nitro-modules'],
      metafile: true,
      logLevel: 'silent',
    })
    const inputs = Object.keys(result.metafile!.inputs)
    for (const framework of [
      'Foundation',
      'UIKit',
      'LocalAuthentication',
      'Contacts',
      'ContactsUI',
    ]) {
      expect(
        inputs.some((name) => name.endsWith(`/dist/esm/ios/${framework}.native.js`))
      ).toBe(true)
    }
    expect(inputs.some((name) => name.includes('/ios-bindings/'))).toBe(false)
    expect(inputs.some((name) => name.endsWith('/dist/esm/ios-runtime.native.js'))).toBe(
      true
    )
    expect(inputs.some((name) => name.includes('/ios-types/'))).toBe(false)
    for (const output of Object.values(result.metafile!.outputs)) {
      expect(output.imports.every(({ path }) => !path.startsWith('one/ios'))).toBe(true)
    }

    // every shipped framework resolves for both native import and require.
    const frameworks = readdirSync(join(installed, 'ios-bindings')).filter((name) =>
      name.endsWith('.ts')
    )
    const specifiers = frameworks.map((name) => `one/ios/${name.slice(0, -3)}`)
    writeFileSync(
      join(consumer, 'resolve.mjs'),
      `
      import { createRequire } from 'node:module';
      const require = createRequire(import.meta.url);
      for (const name of ${JSON.stringify(specifiers)}) {
        const suffix = '/dist/esm/ios/' + name.slice(8) + '.native.js';
        if (!import.meta.resolve(name).endsWith(suffix) || !require.resolve(name).endsWith(suffix)) throw Error(name);
      }
    `
    )
    execFileSync('node', ['--conditions=react-native', 'resolve.mjs'], { cwd: consumer })

    // native custom conditions must still select declarations, not facade code.
    writeFileSync(
      join(consumer, 'index.ts'),
      'import type { Bundle } from "one/ios/Foundation"; export type AppBundle = Bundle'
    )
    writeFileSync(
      join(consumer, 'tsconfig.json'),
      JSON.stringify({
        compilerOptions: {
          module: 'ESNext',
          moduleResolution: 'Bundler',
          customConditions: ['react-native'],
          types: [],
        },
        files: ['index.ts'],
      })
    )
    const require = createRequire(import.meta.url)
    const compiler = join(require.resolve('typescript/package.json'), '../bin/tsc')
    const files = execFileSync(
      'node',
      [compiler, '-p', join(consumer, 'tsconfig.json'), '--listFilesOnly'],
      { encoding: 'utf8' }
    )
    expect(files).toContain(join(installed, 'ios-types/Foundation.d.ts'))
    expect(files).not.toContain(join(installed, 'ios-bindings/Foundation.ts'))
    expect(files).not.toContain(join(installed, 'dist/esm/ios/Foundation.native.js'))

    // ordinary browser and node consumers cannot import an Apple runtime.
    await expect(
      build({
        stdin: { contents: 'export * from "one/ios/Foundation"', resolveDir: consumer },
        bundle: true,
        write: false,
        platform: 'browser',
        logLevel: 'silent',
      })
    ).rejects.toThrow('Could not resolve "one/ios/Foundation"')
    expect(() =>
      execFileSync('node', ['resolve.mjs'], { cwd: consumer, stdio: 'pipe' })
    ).toThrow()
  } finally {
    rmSync(consumer, { recursive: true, force: true })
  }
}, 30_000)
