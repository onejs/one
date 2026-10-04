import { useEffect, useState } from 'react'
import { Image, Platform, Text, View } from 'react-native'
import { One } from 'one'
import { NitroModules } from 'react-native-nitro-modules'
import type {
  MotionReading,
  MotionSensor,
  OneMotion,
} from '../../../packages/one/src/platform/specs/OneMotion.nitro'
import { photoBase64 } from './photo-library-proof-media'

// replaced by the proof server for both native bundles.
const endpoint = '__ONE_MODULE_PROOF_URL__'
function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}
const code = (error: unknown) =>
  error && typeof error === 'object' && 'code' in error ? error.code : undefined
async function rejects(call: () => Promise<unknown>, expected: string) {
  try {
    await call()
  } catch (error) {
    check(code(error) === expected, `${expected}: ${String(error)}`)
    return expected
  }
  throw new Error(`expected ${expected}, operation succeeded`)
}
const bytes = async (uri: string) =>
  new Uint8Array(await (await fetch(uri)).arrayBuffer())
const text = async (uri: string) => (await fetch(uri)).text()
const size = (uri: string): Promise<{ width: number; height: number }> =>
  new Promise((resolve, reject) =>
    Image.getSize(uri, (width, height) => resolve({ width, height }), reject)
  )

async function fileSystem() {
  const fs = One.iOS.FileSystem
  const directories = fs.getDirectories()
  for (const uri of Object.values(directories))
    check(uri.startsWith('file:') && uri.endsWith('/'), 'directory URI')
  const directory = new URL(`one-modules-${Date.now()}/`, directories.cache).href
  const note = new URL('note ü.txt', directory).href
  const binary = new URL('bytes.dat', directory).href
  const copied = new URL('copied/', directories.cache).href
  const moved = new URL('moved/', directory).href
  const nested = new URL('nested/child/', directory).href
  const errors: string[] = []
  await fs.makeDirectory(directory)
  try {
    await fs.writeFile(note, 'héllo 👋')
    let info = await fs.getInfo(note)
    check(
      info.exists &&
        !info.isDirectory &&
        info.size === 11 &&
        (info.modifiedAt ?? 0) > 1e12,
      'UTF-8 info'
    )
    check((await text(note)) === 'héllo 👋', 'UTF-8 fetch')
    await fs.writeFile(note, 'new')
    check(
      (await text(note)) === 'new' && (await fs.getInfo(note)).size === 3,
      'atomic overwrite'
    )
    await fs.writeFile(binary, 'AAEC/w==', 'base64')
    check(Array.from(await bytes(binary)).join(',') === '0,1,2,255', 'binary bytes')
    await fs.makeDirectory(nested)
    await fs.makeDirectory(nested)
    await fs.writeFile(new URL('child.txt', nested).href, 'nested')
    const names = (await fs.readDirectory(directory)).map((entry) => entry.name)
    check(names.join(',') === 'bytes.dat,nested,note ü.txt', `sorted entries: ${names}`)
    const clone = new URL(`copy-${Date.now()}/`, directories.cache).href
    await fs.copy(directory, clone)
    check(
      (await text(new URL('nested/child/child.txt', clone).href)) === 'nested',
      'recursive copy'
    )
    await fs.move(clone, moved)
    check(
      !(await fs.getInfo(clone)).exists && (await fs.getInfo(moved)).isDirectory,
      'directory move'
    )
    errors.push(await rejects(() => fs.copy(note, binary), 'E_FILE_EXISTS'))
    errors.push(await rejects(() => fs.move(note, binary), 'E_FILE_EXISTS'))
    check((await text(note)) === 'new', 'failed move preserves source')
    for (const base64 of ['!?', 'AAE', 'AAEC\n', 'AA==AA==']) {
      errors.push(
        await rejects(() => fs.writeFile(binary, base64, 'base64'), 'E_FILE_ENCODING')
      )
    }
    check(
      Array.from(await bytes(binary)).join(',') === '0,1,2,255',
      'failed write preserves bytes'
    )
    for (const uri of [
      'https://example.com/file',
      'relative.txt',
      'file:///tmp/file?query',
      'file://remote/tmp/file',
    ]) {
      errors.push(await rejects(() => fs.getInfo(uri), 'E_FILE_URI'))
    }
    for (const uri of Object.values(directories)) {
      errors.push(await rejects(() => fs.delete(uri), 'E_FILE_PERMISSION'))
      errors.push(await rejects(() => fs.move(uri, copied), 'E_FILE_PERMISSION'))
    }
    await fs.delete(moved)
    check(
      !(await fs.getInfo(new URL('nested/child/', moved).href)).exists,
      'recursive delete'
    )
    errors.push(
      await rejects(
        () => fs.makeDirectory(new URL('absent/child/', directory).href, false),
        'E_FILE_NOT_FOUND'
      )
    )
    errors.push(
      await rejects(
        () => fs.copy(new URL('missing.txt', directory).href, copied),
        'E_FILE_NOT_FOUND'
      )
    )
    info = await fs.getInfo(new URL('missing.txt', directory).href)
    check(
      !info.exists && info.size === undefined && info.modifiedAt === undefined,
      'missing info'
    )
    return { directories, names, errors }
  } finally {
    await fs.delete(directory)
    check(!(await fs.getInfo(directory)).exists, 'cleanup')
    await rejects(() => fs.delete(note), 'E_FILE_NOT_FOUND')
  }
}

async function images() {
  const fs = One.iOS.FileSystem
  const source = new URL(
    `one-modules-image-${Date.now()}.heic`,
    fs.getDirectories().cache
  ).href
  const invalid = source + '.txt'
  await fs.writeFile(source, photoBase64, 'base64')
  await fs.writeFile(invalid, 'not an image')
  const original = Array.from(await bytes(source)).join(',')
  const output: string[] = []
  const errors: string[] = []
  const results: Record<string, { width: number; height: number; size: number }> = {}
  async function transform(
    name: string,
    uri: string,
    options: Parameters<typeof One.iOS.ImageManipulator.transform>[1],
    width: number,
    height: number
  ) {
    const result = await One.iOS.ImageManipulator.transform(uri, options)
    output.push(result.uri)
    const decoded = await size(result.uri)
    check(
      result.width === width &&
        result.height === height &&
        decoded.width === width &&
        decoded.height === height,
      `${name} dimensions`
    )
    const data = await bytes(result.uri)
    check(
      data.length === result.size && (await fs.getInfo(result.uri)).size === result.size,
      `${name} encoded size`
    )
    const response = await fetch(`${endpoint}/artifact/${Platform.OS}/${name}`, {
      method: 'POST',
      body: data,
    })
    check(response.ok, 'artifact saved')
    results[name] = { width, height, size: result.size }
    return result
  }
  try {
    await transform('upright.png', source, { format: 'png' }, 80, 120)
    await transform(
      'crop-resize-rotate.jpg',
      source,
      {
        crop: { x: 40, y: 0, width: 40, height: 30 },
        resize: { width: 20 },
        rotate: 90,
        quality: 0.6,
      },
      15,
      20
    )
    await transform(
      'height-resize.png',
      source,
      { resize: { height: 60 }, format: 'png' },
      40,
      60
    )
    await transform('rotate180.png', source, { rotate: 180, format: 'png' }, 80, 120)
    await transform('rotate270.png', source, { rotate: 270, format: 'png' }, 120, 80)
    const input = (await (await fetch(`${endpoint}/media`)).json()) as Record<
      string,
      string
    >
    for (const [extension, base64] of Object.entries(input)) {
      const uri = source + '.' + extension
      await fs.writeFile(uri, base64, 'base64')
      output.push(uri)
      const swapsAxes = extension.startsWith('exif') && Number(extension.slice(4)) >= 5
      await transform(
        `${extension}-decoded.png`,
        uri,
        { format: 'png' },
        swapsAxes ? 80 : 120,
        swapsAxes ? 120 : 80
      )
      if (extension === 'png') {
        await transform(
          'png-crop.png',
          uri,
          { crop: { x: 60, y: 0, width: 60, height: 40 }, format: 'png' },
          60,
          40
        )
        await transform('png-rotate90.png', uri, { rotate: 90, format: 'png' }, 80, 120)
        await transform(
          'png-stretch.png',
          uri,
          { resize: { width: 60, height: 60 }, format: 'png' },
          60,
          60
        )
      }
    }
    errors.push(
      await rejects(
        () => One.iOS.ImageManipulator.transform('https://example.com/image'),
        'E_IMAGE_URI'
      )
    )
    errors.push(
      await rejects(
        () => One.iOS.ImageManipulator.transform(source + '.missing'),
        'E_IMAGE_FILE'
      )
    )
    errors.push(
      await rejects(() => One.iOS.ImageManipulator.transform(invalid), 'E_IMAGE_DECODE')
    )
    for (const options of [
      { crop: { x: 1000, y: 0, width: 20, height: 20 } },
      { crop: { x: 0.5, y: 0, width: 20, height: 20 } },
      { resize: {} },
      { resize: { width: 0 } },
      { resize: { width: 10001 } },
      { resize: { width: 6000, height: 6000 } },
      { rotate: 45 },
      { quality: 2 },
      { quality: Number.NaN },
      { format: 'png' as const, quality: 0.5 },
    ])
      errors.push(
        await rejects(
          () => One.iOS.ImageManipulator.transform(source, options),
          'E_IMAGE_INPUT'
        )
      )
    check(Array.from(await bytes(source)).join(',') === original, 'source preserved')
    return { results, errors }
  } finally {
    for (const uri of output) await fs.delete(uri)
    await fs.delete(source)
    await fs.delete(invalid)
  }
}

async function motion() {
  const api = One.iOS.Motion
  const availability = api.getAvailability()
  const sensors: MotionSensor[] = [
    'accelerometer',
    'gyroscope',
    'magnetometer',
    'deviceMotion',
  ]
  const validation: string[] = []
  for (const interval of [-1, 1001, Number.NaN, Infinity]) {
    try {
      api.addListener(
        'accelerometer',
        interval,
        () => {},
        () => {}
      )
    } catch (error) {
      check(error instanceof RangeError, 'interval RangeError')
      validation.push(String(interval))
      continue
    }
    throw new Error('invalid interval accepted')
  }
  const raw = NitroModules.createHybridObject<OneMotion>('OneMotion')
  await new Promise<void>((resolve, reject) => {
    const remove = raw.addListener(
      'accelerometer',
      -1,
      () => reject(new Error('invalid native reading')),
      (code) => {
        try {
          check(code === 'E_MOTION_INPUT', 'native interval error')
          resolve()
        } catch (error) {
          reject(error)
        }
      }
    )
    remove()
    remove()
  })
  const streams: Record<string, unknown> = {}
  for (const sensor of sensors) {
    if (!availability[sensor]) {
      await new Promise<void>((resolve, reject) => {
        const remove = api.addListener(
          sensor,
          0,
          () => reject(new Error('unavailable reading')),
          (code) => {
            try {
              check(code === 'E_MOTION_UNAVAILABLE', 'unavailable error')
              resolve()
            } catch (error) {
              reject(error)
            }
          }
        )
        remove()
        remove()
      })
      streams[sensor] = 'E_MOTION_UNAVAILABLE'
      continue
    }
    const removers: (() => void)[] = []
    try {
      streams[sensor] = await new Promise((resolve, reject) => {
        let fast = 0
        let stoppedAt: number | undefined
        const slow: MotionReading[] = []
        const failure = (code: string, message: string) =>
          reject(new Error(`${code}: ${message}`))
        const timer = setTimeout(
          () => reject(new Error(`${sensor} did not stream`)),
          10_000
        )
        const fastRemove = api.addListener(
          sensor,
          0,
          () => {
            fast++
          },
          failure
        )
        removers.push(fastRemove)
        const slowRemove = api.addListener(
          sensor,
          100,
          (reading) => {
            try {
              check(
                reading.sensor === sensor &&
                  Math.abs(reading.timestampMs - Date.now()) < 5000,
                'sensor and Unix timestamp'
              )
              for (const value of Object.values(reading.value))
                check(Number.isFinite(value), 'finite vector')
              if (sensor === 'deviceMotion') {
                for (const vector of [
                  reading.gravity,
                  reading.userAcceleration,
                  reading.rotationRate,
                  reading.attitude,
                ]) {
                  check(
                    vector && Object.values(vector).every(Number.isFinite),
                    'complete fused reading'
                  )
                }
                check(
                  JSON.stringify(reading.value) ===
                    JSON.stringify(reading.userAcceleration),
                  'device-motion value'
                )
              }
              if (slow.length)
                check(
                  reading.timestampMs - slow.at(-1)!.timestampMs >= 99.9,
                  'per-listener interval'
                )
              slow.push(reading)
              if (slow.length === 2) {
                fastRemove()
                fastRemove()
                stoppedAt = fast
              }
              if (slow.length === 4) {
                check(
                  fast === stoppedAt && fast > 0,
                  'removed fast listener stays silent while slow continues'
                )
                slowRemove()
                slowRemove()
                clearTimeout(timer)
                resolve({ samples: slow, removedFastListenerSilent: true })
              }
            } catch (error) {
              clearTimeout(timer)
              reject(error)
            }
          },
          failure
        )
        removers.push(slowRemove)
      })
    } finally {
      removers.forEach((remove) => remove())
    }
  }
  return { availability, validation, streams }
}

export default function NativeModulesProof() {
  const [status, setStatus] = useState('starting')
  useEffect(() => {
    const run = async () => {
      const result: Record<string, unknown> = { platform: Platform.OS }
      try {
        for (const [name, proof] of Object.entries({ fileSystem, images, motion })) {
          setStatus(`running ${name}`)
          result[name] = await proof()
        }
        result.passed = true
        setStatus('passed')
      } catch (error) {
        result.passed = false
        result.error = String(error)
        setStatus(String(error))
      }
      await fetch(`${endpoint}/report/${Platform.OS}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(result),
      })
    }
    void run()
  }, [])
  return (
    <View style={{ flex: 1, padding: 30, backgroundColor: 'white' }}>
      <Text testID="one-native-modules-status">Native modules: {status}</Text>
    </View>
  )
}
