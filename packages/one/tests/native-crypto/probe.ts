import { installCrypto } from '../../src/platform/crypto/index.native'
import { NitroModules } from 'react-native-nitro-modules'
import type { OneCrypto } from '../../src/platform/specs/OneCrypto.nitro'

installCrypto()
const crypto = globalThis.crypto
const vectors = {
  'SHA-1': 'a9993e364706816aba3e25717850c26c9cd0d89d',
  'SHA-256': 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
  'SHA-384':
    'cb00753f45a35e8bb5a03d699ac65007272c32ab0eded1631a8b605a43ff5bed8086072ba1e7cc2358baeca134c825a7',
  'SHA-512':
    'ddaf35a193617abacc417349ae20413112e6fa4e89a97ea20a9eeee64b55d39a2192992a274fc1a836ba3c23a3feebbd454d4423643ce80e2a9ac94fa54ca49f',
}
const hex = (value: ArrayBuffer) =>
  Array.from(new Uint8Array(value), (b) => b.toString(16).padStart(2, '0')).join('')
const results: string[] = []
function check(condition: boolean, label: string) {
  if (!condition) throw Error(label)
  results.push(label)
}
async function run() {
  check(typeof (globalThis as any).HermesInternal === 'object', 'real Hermes runtime')
  const first = crypto.randomUUID()
  const second = crypto.randomUUID()
  check(
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(first) &&
      first !== second,
    'secure UUIDs unchanged'
  )
  const random = new Uint8Array(18).fill(255)
  const view = random.subarray(1, 17)
  check(
    crypto.getRandomValues(view) === view &&
      random[0] === 255 &&
      random[17] === 255 &&
      view.some((b) => b !== 255),
    'secure random preserves slice and identity'
  )
  const api = crypto.subtle.digest
  installCrypto()
  check(crypto.subtle.digest === api, 'repeat installation preserves digest')
  for (const [algorithm, expected] of Object.entries(vectors)) {
    const bytes = new Uint8Array([255, 97, 98, 99, 254])
    for (const data of [
      bytes.slice(1, 4).buffer,
      bytes.subarray(1, 4),
      new DataView(bytes.buffer, 1, 3),
    ]) {
      const promise = crypto.subtle.digest({ name: algorithm.toLowerCase() }, data)
      check(promise instanceof Promise, `${algorithm} returns Promise`)
      const output = await promise
      check(
        output instanceof ArrayBuffer && hex(output) === expected,
        `${algorithm} exact bytes ${Object.prototype.toString.call(data)}`
      )
    }
    const original = new Uint8Array([97, 98, 99])
    const pending = crypto.subtle.digest(algorithm, original)
    original.fill(0)
    check(hex(await pending) === expected, `${algorithm} snapshots before return`)
  }
  check(
    hex(await crypto.subtle.digest('SHA-256', new ArrayBuffer(0))) ===
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    'empty SHA-256'
  )
  const large = new Uint8Array(1000000).fill(97)
  check(
    hex(await crypto.subtle.digest('SHA-256', large)) ===
      'cdc76e5c9914fb9281a1c7e284d73e67f1809a48a497200e046d39ccc7112cd0',
    'million-byte streamed SHA-256'
  )
  for (const [algorithm, data, expected] of [
    ['MD5', new ArrayBuffer(0), 'NotSupportedError'],
    [{}, new ArrayBuffer(0), 'TypeError'],
    ['SHA-256', 'abc', 'TypeError'],
    ['SHA256', new ArrayBuffer(0), 'NotSupportedError'],
  ] as const) {
    const promise = crypto.subtle.digest(algorithm as never, data as never)
    check(promise instanceof Promise, `invalid input returns Promise ${expected}`)
    let name = ''
    try {
      await promise
    } catch (e) {
      name = (e as Error).name
    }
    check(name === expected, `invalid input rejected ${expected}`)
  }
  const native = NitroModules.createHybridObject<OneCrypto>('OneCrypto')
  for (const [offset, length] of [
    [-1, 1],
    [0, 4],
    [0.5, 1],
    [0, NaN],
    [Infinity, 0],
  ]) {
    let rejected = false
    try {
      await native.digest('SHA-256', new ArrayBuffer(3), offset, length)
    } catch {
      rejected = true
    }
    check(rejected, `native rejects range ${offset}/${length}`)
  }
  const started = Date.now()
  await Promise.all(
    Array.from({ length: 16 }, () => crypto.subtle.digest('SHA-256', large))
  )
  return {
    hermes: true,
    passed: results.length,
    results,
    concurrent16Ms: Date.now() - started,
  }
}
run().then(
  (result) => (globalThis as any).report(JSON.stringify(result)),
  (error) =>
    (globalThis as any).report(
      JSON.stringify({ failed: String(error), passed: results.length, results })
    )
)
