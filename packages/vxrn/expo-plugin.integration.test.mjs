import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import vxrnPlugin, { HERMES_MINIFY_PATCH_MARKER } from './expo-plugin.cjs'

const SAMPLE_PODFILE = `require_relative '../node_modules/react-native/scripts/react_native_pods'

target 'TestApp' do
  use_react_native!(:hermes_enabled => true)

  post_install do |installer|
    react_native_post_install(installer)
  end
end
`

/**
 * Invoke the vxrn expo plugin's iOS dangerous mod directly against a
 * synthetic project layout. Verifies the full plugin pipeline (not just
 * the helper functions) patches the Podfile correctly.
 */
async function runVxrnDangerousMod(projectRoot, opts = {}) {
  const iosRoot = path.join(projectRoot, 'ios')
  fs.mkdirSync(iosRoot, { recursive: true })
  fs.writeFileSync(path.join(iosRoot, 'Podfile'), SAMPLE_PODFILE)
  fs.writeFileSync(
    path.join(projectRoot, 'package.json'),
    JSON.stringify({ name: 'test' })
  )

  if (opts.podfileProperties) {
    fs.writeFileSync(
      path.join(iosRoot, 'Podfile.properties.json'),
      JSON.stringify(opts.podfileProperties)
    )
  }

  let config = {
    name: 'TestApp',
    slug: 'test-app',
    ios: { bundleIdentifier: 'com.test.app' },
    android: { package: 'com.test.app' },
    _internal: {
      projectRoot,
      staticConfigPath: null,
      dynamicConfigPath: null,
    },
  }

  config = vxrnPlugin(config, {})

  const dangerousMod = config.mods.ios.dangerous
  await dangerousMod({
    ...config,
    modRequest: {
      platformProjectRoot: iosRoot,
      projectRoot,
      platform: 'ios',
      modName: 'dangerous',
      projectName: 'TestApp',
      introspect: false,
    },
    modResults: {},
  })

  return fs.readFileSync(path.join(iosRoot, 'Podfile'), 'utf8')
}

describe('vxrn expo-plugin (integration via dangerous mod pipeline)', () => {
  let tmpDir

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vxrn-int-'))
  })

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  it('applies the hermes minification patch', async () => {
    const podfile = await runVxrnDangerousMod(tmpDir)
    expect(podfile).toContain(HERMES_MINIFY_PATCH_MARKER)
  })

  it('opt-out via Podfile.properties.json skips the hermes patch', async () => {
    const podfile = await runVxrnDangerousMod(tmpDir, {
      podfileProperties: { 'one.disableHermesMinification': 'true' },
    })
    expect(podfile).not.toContain(HERMES_MINIFY_PATCH_MARKER)
  })

  it('is idempotent — running the dangerous mod twice produces the same Podfile', async () => {
    const first = await runVxrnDangerousMod(tmpDir)

    const iosRoot = path.join(tmpDir, 'ios')
    let config = {
      name: 'TestApp',
      slug: 'test-app',
      ios: {},
      android: {},
      _internal: { projectRoot: tmpDir, staticConfigPath: null, dynamicConfigPath: null },
    }
    config = vxrnPlugin(config, {})
    await config.mods.ios.dangerous({
      ...config,
      modRequest: {
        platformProjectRoot: iosRoot,
        projectRoot: tmpDir,
        platform: 'ios',
        modName: 'dangerous',
        projectName: 'TestApp',
        introspect: false,
      },
      modResults: {},
    })
    const second = fs.readFileSync(path.join(iosRoot, 'Podfile'), 'utf8')

    expect(second).toBe(first)
  })
})
