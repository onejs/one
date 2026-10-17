// guards for what one ships into real android app builds: the native
// library must stay 16 kb page aligned.
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const here = dirname(fileURLToPath(import.meta.url))
const oneDir = resolve(here, '../..')

describe('shipped android artifacts', () => {
  it('builds the native library 16 kb page aligned', () => {
    // google play requires 16 kb page support for targetSdk 35+, and the
    // pinned ndk 27 defaults to 4 kb. react native's gradle plugin injects
    // this flag into app modules only, never libraries, so the library
    // must pass it to cmake itself or libOne.so fails to load on 16 kb
    // page devices.
    const gradle = readFileSync(join(oneDir, 'android/build.gradle'), 'utf8')
    expect(gradle).toContain('-DANDROID_SUPPORT_FLEXIBLE_PAGE_SIZES=ON')
  })
})
