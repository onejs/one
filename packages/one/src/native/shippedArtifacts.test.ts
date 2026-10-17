// guards for what one ships into real ios app builds: the pod must
// carry a privacy manifest covering the required-reason apis its
// sources use, and reference only resources that exist.
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const here = dirname(fileURLToPath(import.meta.url))
const oneDir = resolve(here, '../..')

function readSources(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'Tests') continue
    const full = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...readSources(full))
    else if (/\.(swift|m|mm|h|cpp)$/.test(entry.name)) out.push(readFileSync(full, 'utf8'))
  }
  return out
}

describe('shipped ios artifacts', () => {
  it('ships a privacy manifest covering the required-reason apis in use', () => {
    const manifestPath = join(oneDir, 'ios/PrivacyInfo.xcprivacy')
    expect(existsSync(manifestPath)).toBe(true)
    const manifest = readFileSync(manifestPath, 'utf8')
    expect(manifest).toContain('<plist version="1.0">')
    // reasons mirror expo's shipped manifests for the same api surface:
    // user defaults (expo-constants), boot time (expo-device), file
    // timestamps and disk space (expo-file-system).
    const expected: Record<string, string[]> = {
      NSPrivacyAccessedAPICategoryUserDefaults: ['CA92.1'],
      NSPrivacyAccessedAPICategorySystemBootTime: ['35F9.1'],
      NSPrivacyAccessedAPICategoryFileTimestamp: ['0A2A.1', '3B52.1'],
      NSPrivacyAccessedAPICategoryDiskSpace: ['E174.1', '85F4.1'],
    }
    for (const [category, reasons] of Object.entries(expected)) {
      expect(manifest).toContain(category)
      for (const reason of reasons) expect(manifest).toContain(reason)
    }
    // every declared category must have a use in the shipped sources, and
    // no other required-reason category may appear without one.
    const sources = readSources(join(oneDir, 'ios'))
    const uses: Record<string, RegExp> = {
      NSPrivacyAccessedAPICategoryUserDefaults: /UserDefaults|AppStorage/,
      NSPrivacyAccessedAPICategorySystemBootTime: /systemUptime|kern\.boottime/,
      NSPrivacyAccessedAPICategoryFileTimestamp:
        /attributesOfItem|\.modificationDate|\.creationDate|\.fileCreationDate/,
      NSPrivacyAccessedAPICategoryDiskSpace:
        /attributesOfFileSystem|systemFreeSize|systemSize|volumeAvailableCapacity/,
    }
    for (const [category, pattern] of Object.entries(uses)) {
      expect(sources.some((source) => pattern.test(source))).toBe(true)
    }
    expect(sources.some((source) => /activeKeyboards/.test(source))).toBe(false)
    // the pod must bundle the manifest, and the npm tarball must include it.
    const podspec = readFileSync(join(oneDir, 'One.podspec'), 'utf8')
    expect(podspec).toContain('PrivacyInfo.xcprivacy')
    const files: string[] = JSON.parse(
      readFileSync(join(oneDir, 'package.json'), 'utf8')
    ).files
    expect(files).toContain('ios')
  })

  it('references only podspec headers that exist', () => {
    const podspec = readFileSync(join(oneDir, 'One.podspec'), 'utf8')
    const headers = podspec.match(/'ios\/[^']+\.h'/g) ?? []
    expect(headers.length).toBeGreaterThan(0)
    for (const quoted of headers) {
      expect(existsSync(join(oneDir, quoted.slice(1, -1)))).toBe(true)
    }
    for (const generated of [
      'nitrogen/generated/ios/One+autolinking.rb',
      'nitrogen/generated/ios/One-Swift-Cxx-Bridge.hpp',
      'schema.json',
    ]) {
      expect(existsSync(join(oneDir, generated))).toBe(true)
    }
  })
})
