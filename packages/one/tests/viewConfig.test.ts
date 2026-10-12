import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { transformSync } from '@babel/core'
import { emitViewConfig, isViewSpecFile } from '../codegen/emitViewConfig'

const require = createRequire(import.meta.url)
const codegenPlugin = require('@react-native/babel-plugin-codegen')

const specsDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'platform', 'specs')
const specs = readdirSync(specsDir)
  .filter((name) => name.endsWith('.ts'))
  .filter(isViewSpecFile)
  .sort()

// The parity baseline: the real plugin with pinned options. Both sides share
// the installed parser, generator, and codegen, so an upgrade moves both
// byte streams together; the test pins our splice against the plugin's.
const pluginOutput = (source: string, filename: string) =>
  transformSync(source, {
    filename,
    plugins: [codegenPlugin],
    parserOpts: { plugins: ['typescript'] },
    babelrc: false,
    configFile: false,
  })!.code!

describe('static view-config emission', () => {
  it.each(specs)('matches the babel plugin byte for byte: %s', (name) => {
    const filename = join(specsDir, name)
    const source = readFileSync(filename, 'utf8')
    expect(emitViewConfig(source, filename)).toBe(pluginOutput(source, filename))
  })

  it('removes a Commands export like the plugin', () => {
    const filename = 'FixtureNativeComponent.ts'
    const source = `import * as React from 'react'
import type { ViewProps, HostComponent } from 'react-native'
import codegenNativeComponent from 'react-native/Libraries/Utilities/codegenNativeComponent'
import codegenNativeCommands from 'react-native/Libraries/Utilities/codegenNativeCommands'

export interface NativeProps extends ViewProps {
  enabled?: boolean
}

interface NativeCommands {
  setEnabled: (viewRef: React.ElementRef<HostComponent<NativeProps>>, enabled: boolean) => void
}

export const Commands = codegenNativeCommands<NativeCommands>({
  supportedCommands: ['setEnabled'],
})

export default codegenNativeComponent<NativeProps>('FixtureView') as HostComponent<NativeProps>
`
    expect(emitViewConfig(source, filename)).toBe(pluginOutput(source, filename))
  })

  it('throws when the file has no codegen export', () => {
    expect(() => emitViewConfig('export default 42\n', 'Plain.ts')).toThrow(
      'has no codegenNativeComponent default export'
    )
  })

  it('keeps TurboModule specs out of view-config parity', () => {
    expect(isViewSpecFile('OneNativeTextFieldNativeComponent.ts')).toBe(true)
    expect(isViewSpecFile('OneNativeSyncStateNativeModule.ts')).toBe(false)
    expect(specs).not.toContain('OneNativeSyncStateNativeModule.ts')
  })
})
