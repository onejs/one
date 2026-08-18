import { spawnSync } from 'node:child_process'
import { describe, expect, it } from 'vitest'

const malformedImages = [
  {
    name: 'icns',
    bytes: [0x69, 0x63, 0x6e, 0x73, 0, 0, 0, 16, 0x69, 0x73, 0x33, 0x32, 0, 0, 0, 0],
    error: 'Invalid ICNS, invalid entry length',
  },
  {
    name: 'jxl',
    bytes: [
      0, 0, 0, 12, 0x4a, 0x58, 0x4c, 0x20, 0x0d, 0x0a, 0x87, 0x0a, 0, 0, 0, 12, 0x66,
      0x74, 0x79, 0x70, 0x6a, 0x78, 0x6c, 0x20, 0, 0, 0, 0, 0x6a, 0x78, 0x6c, 0x70,
    ],
    error: 'No codestream found in JXL container',
  },
  {
    name: 'heif',
    bytes: [
      0, 0, 0, 16, 0x66, 0x74, 0x79, 0x70, 0x61, 0x76, 0x69, 0x66, 0, 0, 0, 0, 0, 0, 0,
      36, 0x6d, 0x65, 0x74, 0x61, 0, 0, 0, 0, 0, 0, 0, 8, 0x69, 0x70, 0x72, 0x70, 0, 0, 0,
      20, 0x69, 0x70, 0x63, 0x6f, 0, 0, 0, 0, 0x69, 0x73, 0x70, 0x65, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0,
    ],
    error: 'Invalid HEIF, no size found',
  },
]

describe('image-size malformed container handling', () => {
  it.each(malformedImages)('rejects malformed $name data', ({ bytes, error }) => {
    const result = spawnSync(
      process.execPath,
      [
        '-e',
        `const { imageSize } = require('image-size'); try { imageSize(Uint8Array.from(${JSON.stringify(bytes)})); process.exit(2) } catch (error) { process.exit(error instanceof Error && error.message === ${JSON.stringify(error)} ? 0 : 3) }`,
      ],
      { timeout: 1_000 }
    )

    expect(result.error).toBeUndefined()
    expect(result.signal).toBeNull()
    expect(result.status).toBe(0)
  })
})
