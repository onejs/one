import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '../../..')
const files = [
  'packages/one/cpp/HybridOneCrypto.cpp',
  'packages/one/cpp/HybridOneStorage.cpp',
  'packages/one/ios/Nitro/HybridOneFileSystem.swift',
  'packages/one/ios/Nitro/HybridOneMotion.swift',
  'packages/one/ios/Nitro/HybridOneImageManipulator.swift',
  'packages/one/ios/Nitro/HybridOneFetch.swift',
  ...['FileSystem', 'Motion', 'ImageManipulator', 'Fetch'].map(
    (name) =>
      `packages/one/android/src/main/java/com/margelo/nitro/one/HybridOne${name}.kt`
  ),
  'tests/native-features/assets/one-speed-12mp.jpg',
]
const config = {
  server: process.env.ONE_SPEED_SERVER ?? 'http://127.0.0.1:4399',
  androidServer: process.env.ONE_SPEED_ANDROID_SERVER ?? 'http://10.0.2.2:4399',
  device: process.env.ONE_SPEED_DEVICE ?? 'ios-sim-baseline',
  suite: process.env.ONE_SPEED_SUITE ?? 'all',
  sourceCommit: execFileSync('git', ['rev-parse', 'HEAD'], {
    cwd: root,
    encoding: 'utf8',
  }).trim(),
  sourceHashes: Object.fromEntries(
    files.map((file) => [
      file,
      createHash('sha256')
        .update(readFileSync(resolve(root, file)))
        .digest('hex'),
    ])
  ),
}
writeFileSync(
  resolve(import.meta.dirname, 'run-config.json'),
  JSON.stringify(config, null, 2) + '\n'
)
