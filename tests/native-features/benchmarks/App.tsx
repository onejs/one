import { useEffect, useState } from 'react'
import { Linking, NativeModules, Platform, Text, View } from 'react-native'
import { File } from 'expo-file-system'
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator'
import { Accelerometer } from 'expo-sensors'
import { fetch as expoFetch } from 'expo/fetch'
import NitroFS from 'react-native-nitro-fs'
import { MMKV } from 'react-native-mmkv'
import QuickCrypto from 'react-native-quick-crypto'
import {
  accelerometer,
  setUpdateIntervalForType,
  SensorTypes,
} from 'react-native-sensors'
import { FileSystem } from '../../../packages/one/src/platform/file-system/index.native'
import { ImageManipulator } from '../../../packages/one/src/platform/image-manipulator/index.native'
import { Motion } from '../../../packages/one/src/platform/motion/index.native'
import { Storage } from '../../../packages/one/src/platform/storage/index.native'
import { benchmarkFileSystem } from '../fixtures/one-native-file-system'
import { benchmarkFetch } from '../fixtures/one-native-fetch'
import { benchmarkMotion } from '../fixtures/one-native-motion'
import { benchmarkImageManipulator } from '../fixtures/one-native-image-manipulator'
import { benchmarkCrypto } from '../fixtures/one-native-crypto'
import { benchmarkStorage } from '../fixtures/one-native-storage'
import { compare } from '../fixtures/native-speed'
import config from './run-config.json'
import Contracts from './contracts'

const fs = FileSystem
const path = (uri: string) => decodeURIComponent(new URL(uri).pathname)
const mmkv = new MMKV({ id: 'one-native-speed' })
const versions = {
  one: require('../../../packages/one/package.json').version,
  expo: require('expo/package.json').version,
  fileSystem: require('expo-file-system/package.json').version,
  nitroFS: require('react-native-nitro-fs/package.json').version,
  sensors: require('expo-sensors/package.json').version,
  rnSensors: require('react-native-sensors/package.json').version,
  image: require('expo-image-manipulator/package.json').version,
  crypto: require('react-native-quick-crypto/package.json').version,
  mmkv: require('react-native-mmkv/package.json').version,
}

async function run(
  suite: string,
  server: string,
  device: string,
  report: (message: string) => void
) {
  const measurements: unknown[] = []
  const metadata = {
    device,
    suite,
    platform: Platform.OS,
    osVersion: Platform.Version,
    sourceCommit: config.sourceCommit,
    sourceHashes: config.sourceHashes,
    versions,
    development: __DEV__,
    hermes: !!Reflect.get(globalThis, 'HermesInternal'),
    workloadVersion: 1,
  }
  if (__DEV__) throw new Error('benchmarks require a Release bundle')
  async function persist(status: string, error?: string) {
    const response = await expoFetch(`${server}/result`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...metadata, status, error, measurements }),
    })
    if (response.status !== 200) throw new Error('benchmark result was not saved')
  }
  async function record(sample: unknown) {
    measurements.push(sample)
    await persist('running')
    report(`${suite}: ${measurements.length} samples saved`)
  }
  try {
    if (suite === 'filesystem') {
      const root = fs.getDirectories().cache + 'one-speed-files/'
      await fs.makeDirectory(root)
      await compare(
        {
          one: () =>
            benchmarkFileSystem(
              {
                write: (uri, value) => fs.writeFile(uri, value),
                info: async (uri) => ({ size: (await fs.getInfo(uri)).size! }),
                copy: fs.copy,
                remove: fs.delete,
              },
              root
            ),
          expo: () =>
            benchmarkFileSystem(
              {
                write: async (uri, value) => new File(uri).write(value),
                info: async (uri) => ({ size: new File(uri).size }),
                copy: async (from, to) => new File(from).copy(new File(to)),
                remove: async (uri) => new File(uri).delete(),
              },
              root
            ),
          nitro: () =>
            benchmarkFileSystem(
              {
                write: (uri, value) => NitroFS.writeFile(path(uri), value, 'utf8'),
                info: async (uri) => ({ size: (await NitroFS.stat(path(uri))).size }),
                copy: (from, to) => NitroFS.copyFile(path(from), path(to)),
                remove: async (uri) => {
                  await NitroFS.unlink(path(uri))
                },
              },
              root
            ),
        },
        record
      )
      await fs.delete(root)
    } else if (suite === 'fetch') {
      await compare(
        {
          one: async () => ({
            paced: await benchmarkFetch(fetch, `${server}/stream?paced=1`, 32),
            bulk: await benchmarkFetch(fetch, `${server}/stream?paced=0`, 512),
          }),
          expo: async () => ({
            paced: await benchmarkFetch(
              expoFetch as typeof fetch,
              `${server}/stream?paced=1`,
              32
            ),
            bulk: await benchmarkFetch(
              expoFetch as typeof fetch,
              `${server}/stream?paced=0`,
              512
            ),
          }),
        },
        record
      )
    } else if (suite === 'image') {
      const source = fs.getDirectories().cache + 'one-speed-12mp.jpg'
      const bytes = new Uint8Array(
        await (await expoFetch(`${server}/photo`)).arrayBuffer()
      )
      new File(source).write(bytes)
      await compare(
        {
          one: () =>
            benchmarkImageManipulator(
              (uri, format) =>
                ImageManipulator.transform(uri, {
                  resize: { width: 1000 },
                  format,
                  ...(format === 'jpeg' ? { quality: 0.9 } : {}),
                }),
              source,
              fs.delete
            ),
          expo: () =>
            benchmarkImageManipulator(
              (uri, format) =>
                manipulateAsync(uri, [{ resize: { width: 1000 } }], {
                  format: format === 'jpeg' ? SaveFormat.JPEG : SaveFormat.PNG,
                  compress: 0.9,
                }),
              source,
              fs.delete
            ),
        },
        record
      )
      await fs.delete(source)
    } else if (suite === 'crypto') {
      await compare(
        { one: () => benchmarkCrypto(crypto), quick: () => benchmarkCrypto(QuickCrypto) },
        record
      )
    } else if (suite === 'storage') {
      await compare(
        {
          one: () =>
            benchmarkStorage({
              set: Storage.setItem,
              get: Storage.getItem,
              remove: Storage.removeItem,
              keys: Storage.getAllKeys,
            }),
          mmkv: () =>
            benchmarkStorage({
              set: (key, value) => mmkv.set(key, value),
              get: (key) => mmkv.getString(key),
              remove: (key) => mmkv.delete(key),
              keys: () => mmkv.getAllKeys(),
            }),
        },
        record
      )
    } else if (suite === 'motion') {
      for (const interval of [1000 / 60, 0]) {
        await compare(
          {
            one: () =>
              benchmarkMotion(
                {
                  available: async () => Motion.getAvailability().accelerometer,
                  subscribe: (ms, receive, error) =>
                    Motion.addListener(
                      'accelerometer',
                      ms,
                      (reading) =>
                        receive({ ...reading.value, timestampMs: reading.timestampMs }),
                      (code, message) => error(`${code}: ${message}`)
                    ),
                },
                interval
              ),
            expo: () =>
              benchmarkMotion(
                {
                  available: () => Accelerometer.isAvailableAsync(),
                  subscribe: (ms, receive) => {
                    Accelerometer.setUpdateInterval(ms)
                    const subscription = Accelerometer.addListener((reading) =>
                      receive({ ...reading, timestampMs: reading.timestamp * 1000 })
                    )
                    return () => subscription.remove()
                  },
                },
                interval
              ),
            sensors: () =>
              benchmarkMotion(
                {
                  available: async () => {
                    try {
                      await NativeModules.RNSensorsAccelerometer.isAvailable()
                      return true
                    } catch {
                      return false
                    }
                  },
                  subscribe: (ms, receive, error) => {
                    setUpdateIntervalForType(SensorTypes.accelerometer, ms)
                    const subscription = accelerometer.subscribe({
                      next: (reading) =>
                        receive({ ...reading, timestampMs: reading.timestamp }),
                      error,
                    })
                    return () => subscription.unsubscribe()
                  },
                },
                interval
              ),
          },
          record
        )
      }
    } else {
      throw new Error(`unknown benchmark suite ${suite}`)
    }
    await persist('done')
    report(`${suite}: done`)
  } catch (error) {
    const message =
      error instanceof Error ? (error.stack ?? error.message) : String(error)
    await persist('failed', message)
    report(`${suite}: failed ${message}`)
    throw error
  }
}

export default function App() {
  const [status, setStatus] = useState('ready')
  const [contracts, setContracts] = useState(false)
  useEffect(() => {
    Linking.getInitialURL()
      .then(async (url) => {
        const params = url ? new URL(url).searchParams : new URLSearchParams()
        const server =
          params.get('server') ??
          (Platform.OS === 'android' ? config.androidServer : config.server)
        const device = params.get('device') ?? config.device
        const suite = params.get('suite') ?? config.suite
        if (suite === 'contracts') {
          setContracts(true)
          return
        }
        for (const name of suite === 'all'
          ? ['storage', 'crypto', 'filesystem', 'fetch', 'image', 'motion']
          : [suite]) {
          await run(name, server, device, setStatus)
        }
        setStatus('all requested benchmarks saved')
      })
      .catch((error) => setStatus(`failed: ${String(error)}`))
  }, [])
  if (contracts) return <Contracts />
  return (
    <View style={{ padding: 50 }}>
      <Text>{status}</Text>
    </View>
  )
}
