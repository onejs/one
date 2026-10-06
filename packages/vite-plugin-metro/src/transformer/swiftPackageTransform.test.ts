import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
// @ts-expect-error: module.exports supplies the transformer at runtime.
import babelTransformer from './babel-transformer'
import { transform as transformNative } from './metroNativeWorker'

const projectRoot = resolve(__dirname, '../../../../tests/native-features')
const filename = resolve(projectRoot, 'native-source/Audio.swift')

describe('metro swift source import', () => {
  it('transforms the fixture through both Metro transformer implementations', async () => {
    const source = readFileSync(filename)
    const native = await transformNative({}, projectRoot, filename, source, {
      dev: true,
      minify: false,
      platform: 'ios',
      type: 'module',
    })
    expect(native.output[0].data.code).toContain('AudioMath')
    expect(native.output[0].data.code).toContain('callNativeSource')

    const babel = babelTransformer.transform({
      filename,
      src: source.toString('utf8'),
      options: {
        projectRoot,
        dev: true,
        platform: 'ios',
        customTransformOptions: {
          environment: 'client',
          vite: {
            oneViteMetroBabelConfig: true,
            babelConfig: { babelrc: false, configFile: false, presets: [], plugins: [] },
          },
        },
      },
      plugins: [],
    })
    expect(JSON.stringify(babel.ast)).toContain('AudioMath')
    expect(JSON.stringify(babel.ast)).toContain('callNativeSource')
    await expect(transformNative({}, projectRoot, filename, source, {
      dev: true,
      platform: 'android',
      type: 'module',
    })).rejects.toThrow('Android build')
  })
})

describe('metro kotlin source import', () => {
  const kotlin = resolve(projectRoot, 'native-source/Audio.kt')

  it('transforms the fixture through both Metro transformer implementations', async () => {
    const source = readFileSync(kotlin)
    const native = await transformNative({}, projectRoot, kotlin, source, {
      dev: true,
      minify: false,
      platform: 'android',
      type: 'module',
    })
    expect(native.output[0].data.code).toContain('AudioMath')
    expect(native.output[0].data.code).toContain('callNativeSource')

    const babel = babelTransformer.transform({
      filename: kotlin,
      src: source.toString('utf8'),
      options: {
        projectRoot,
        dev: true,
        platform: 'android',
        customTransformOptions: {
          environment: 'client',
          vite: {
            oneViteMetroBabelConfig: true,
            babelConfig: { babelrc: false, configFile: false, presets: [], plugins: [] },
          },
        },
      },
      plugins: [],
    })
    expect(JSON.stringify(babel.ast)).toContain('AudioMath')
    expect(JSON.stringify(babel.ast)).toContain('callNativeSource')
    await expect(transformNative({}, projectRoot, kotlin, source, {
      dev: true,
      platform: 'ios',
      type: 'module',
    })).rejects.toThrow('iOS build')
  })
})
