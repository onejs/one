import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { configureVXRNCompilerPlugin } from './configure'
import { getBabelOptions, transformBabel } from './transformBabel'

afterEach(() => {
  configureVXRNCompilerPlugin({ enableReanimated: false })
})

describe('getBabelOptions Worklets resolution', () => {
  it('uses the app-installed Worklets Babel plugin', () => {
    const projectRoot = fs.realpathSync(
      fs.mkdtempSync(path.join(os.tmpdir(), 'vxrn-worklets-'))
    )
    const packageRoot = path.join(projectRoot, 'node_modules', 'react-native-worklets')
    const pluginPath = path.join(packageRoot, 'plugin.js')
    fs.mkdirSync(packageRoot, { recursive: true })
    fs.writeFileSync(
      path.join(packageRoot, 'package.json'),
      JSON.stringify({ name: 'react-native-worklets', version: '99.0.0' })
    )
    fs.writeFileSync(pluginPath, 'module.exports = () => ({ visitor: {} })')

    try {
      configureVXRNCompilerPlugin({ enableReanimated: true })
      const options = getBabelOptions({
        id: path.join(projectRoot, 'input.ts'),
        code: `export const worklet = () => {
          'worklet'
        }`,
        development: true,
        environment: 'ios',
        reactForRNVersion: '19',
        projectRoot,
      })

      expect(options?.plugins).toContain(pluginPath)
    } finally {
      fs.rmSync(projectRoot, { recursive: true, force: true })
    }
  })
})

describe('transformBabel Flow parsing', () => {
  it('parses and strips React Native Flow as-casts', async () => {
    const result = await transformBabel(
      '/project/VirtualViewNativeComponent.js',
      `
        // @flow strict-local
        import type { HostComponent } from './HostComponent'
        import codegenNativeComponent from './codegenNativeComponent'

        type Props = $ReadOnly<{ enabled?: boolean }>

        export default codegenNativeComponent<Props>('VirtualView') as HostComponent<Props>
      `,
      { plugins: [] }
    )

    expect(result?.code).toContain("codegenNativeComponent('VirtualView')")
    expect(result?.code).not.toContain('HostComponent')
  })
})
