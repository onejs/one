import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { blessedNativePackages } from '../native-packages'
import { checkNativePackages } from './checkNativePackages'

let root: string
function install(name: string, version: string) {
  const dir = join(root, 'node_modules', name)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ name, version }))
}
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'one-native-packages-'))
  writeFileSync(
    join(root, 'package.json'),
    JSON.stringify({
      dependencies: Object.fromEntries(
        blessedNativePackages.map(({ name, range }) => [name, range])
      ),
    })
  )
  for (const { name, range } of blessedNativePackages) install(name, range.slice(1))
})
afterEach(() => rmSync(root, { recursive: true, force: true }))

describe('native package contract', () => {
  it('accepts installed tested versions on both native platforms', () => {
    expect(() => checkNativePackages(root, 'ios')).not.toThrow()
    expect(() => checkNativePackages(root, 'android')).not.toThrow()
  })
  it('rejects an incompatible installed version despite a matching declaration', () => {
    install('react-native-reanimated', '4.5.0')
    expect(() => checkNativePackages(root, 'ios')).toThrow(
      'react-native-reanimated@4.5.0 does not satisfy ~4.6.0'
    )
  })
  it('requires app declarations even when every peer is hoisted', () => {
    writeFileSync(join(root, 'package.json'), '{}')
    expect(() => checkNativePackages(root, 'android')).toThrow(
      'react-native-worklets@~0.12.2 is required'
    )
  })
  it('requires declared packages to be installed', () => {
    rmSync(join(root, 'node_modules/react-native-worklets'), { recursive: true })
    expect(() => checkNativePackages(root)).toThrow(
      'react-native-worklets is declared but not installed'
    )
  })
  it('allows a native app without gesture handler until it opts into gestures', () => {
    writeFileSync(
      join(root, 'package.json'),
      JSON.stringify({
        dependencies: Object.fromEntries(
          blessedNativePackages
            .filter(({ required }) => required)
            .map(({ name, range }) => [name, range])
        ),
      })
    )
    expect(() => checkNativePackages(root, 'ios')).not.toThrow()
  })
  it('does not read a manifest or native packages for web-only apps', () => {
    rmSync(root, { recursive: true })
    expect(() => checkNativePackages(root, 'web')).not.toThrow()
  })
})
