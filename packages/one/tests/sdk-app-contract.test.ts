import { execFileSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, it } from 'vitest'

it('rejects a mismatched shipped ABI without touching the coherent native pod or invoking Xcode', () => {
  const root = mkdtempSync(join(tmpdir(), 'one-sdk-contract-'))
  try {
    const out = join(root, 'dist/sdk')
    const packageRoot = join(import.meta.dirname, '..')
    execFileSync('bun', [join(packageRoot, 'codegen/sdk/build.ts'), out])
    mkdirSync(join(root, 'ios-bindings'))
    writeFileSync(join(root, 'ios-bindings/manifest.json'), JSON.stringify({ generation: 'wrong-abi' }))
    const app = join(root, 'app')
    const pod = join(app, 'ios/OneSwiftPackages/OneSDKBindings')
    mkdirSync(pod, { recursive: true })
    writeFileSync(join(pod, 'retained.swift'), '// previous coherent native table\n')
    writeFileSync(join(app, 'entry.ios.ts'), "import { NSUUID } from 'one/ios/Foundation'\n")
    const probe = join(root, 'probe.mjs')
    writeFileSync(probe, `import { writeAppSdkPod } from './dist/sdk/app.mjs';
      try {
        await writeAppSdkPod(${JSON.stringify(app)});
        throw new Error('accepted mismatched SDK ABI');
      } catch (error) {
        if (!error.message.includes('installed iOS facades do not match')) throw error;
        console.log('rejected ABI before native generation');
      }
    `)
    // an empty path makes any accidental native tool invocation fail the probe.
    const output = execFileSync(process.execPath, [probe], {
      encoding: 'utf8', env: { ...process.env, PATH: '' },
    })
    expect(output.trim()).toBe('rejected ABI before native generation')
    expect(readFileSync(join(pod, 'retained.swift'), 'utf8')).toBe('// previous coherent native table\n')
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})
