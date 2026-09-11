import { GenMapping, addMapping, toEncodedMap } from '@jridgewell/gen-mapping'
import { describe, expect, it } from 'vitest'
import {
  getNativeFramePlatform,
  isNativeBundleFrame,
  symbolicateNativeStack,
} from './symbolicateNativeStack'

const BUNDLE_URL =
  'http://10.0.0.7:8081/index.bundle//&platform=ios&dev=true&minify=false'

const SOURCE = ['function boom() {', "  throw new Error('kaboom')", '}', ''].join('\n')

function mapOneFrame() {
  const gen = new GenMapping({ file: 'bundle.js' })
  addMapping(gen, {
    generated: { line: 4102, column: 8 },
    source: '/repo/app/routes/detail.tsx',
    original: { line: 2, column: 2 },
  })
  const map = toEncodedMap(gen)
  return JSON.stringify({ ...map, sourcesContent: [SOURCE] })
}

describe('isNativeBundleFrame', () => {
  it('accepts the bundle urls react native reports and rejects everything else', () => {
    expect(isNativeBundleFrame(BUNDLE_URL)).toBe(true)
    expect(isNativeBundleFrame('http://localhost:8081/index.bundle?platform=ios')).toBe(
      true
    )
    expect(isNativeBundleFrame('[native code]')).toBe(false)
    expect(isNativeBundleFrame('/Users/me/app/Foo.m')).toBe(false)
    expect(isNativeBundleFrame(null)).toBe(false)
  })
})

describe('getNativeFramePlatform', () => {
  it('reads the platform out of either query separator react native uses', () => {
    expect(getNativeFramePlatform(BUNDLE_URL)).toBe('ios')
    expect(
      getNativeFramePlatform('http://h/index.bundle?platform=android&dev=true')
    ).toBe('android')
    expect(getNativeFramePlatform('[native code]')).toBe(null)
  })
})

describe('symbolicateNativeStack', () => {
  it('resolves a bundle frame to the authored file and line', () => {
    const { stack, codeFrame } = symbolicateNativeStack(
      [{ file: BUNDLE_URL, lineNumber: 4102, column: 8, methodName: 'boom' }],
      mapOneFrame()
    )

    expect(stack[0].file).toBe('/repo/app/routes/detail.tsx')
    expect(stack[0].lineNumber).toBe(2)
    expect(stack[0].column).toBe(2)
    expect(stack[0].methodName).toBe('boom')
    expect(codeFrame?.fileName).toBe('/repo/app/routes/detail.tsx')
    expect(codeFrame?.location).toEqual({ row: 2, column: 2 })
    expect(codeFrame?.content).toContain("> 2 |   throw new Error('kaboom')")
  })

  it('hands back frames that did not come from the bundle', () => {
    const frames = [
      { file: '[native code]', lineNumber: null, column: null, methodName: 'nativeCall' },
      { file: '/Users/me/app/AppDelegate.mm', lineNumber: 31, column: 4 },
    ]
    const { stack, codeFrame } = symbolicateNativeStack(frames, mapOneFrame())
    expect(stack).toEqual(frames)
    expect(codeFrame).toBe(null)
  })

  it('leaves a bundle frame alone when the map has no mapping for it', () => {
    const frame = { file: BUNDLE_URL, lineNumber: 9, column: 0, methodName: 'unmapped' }
    const { stack } = symbolicateNativeStack([frame], mapOneFrame())
    expect(stack[0]).toEqual(frame)
  })
})
