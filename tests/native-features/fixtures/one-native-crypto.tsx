import { useCallback, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { NitroModules } from 'react-native-nitro-modules'
import { AESEncryptionKey, AESSealedData, One } from 'one'

// exercises the One crypto polyfill end to end: two randomUUIDs plus a
// getRandomValues fill, all rendered as labels because RN Text testIDs
// vanish from the accessibility snapshot while Pressable IDs survive. the
// module marker proves the OneCrypto nitro hybrid object is registered;
// Valid/Distinct mirror what the conformance scripts re-check from the raw
// labels.
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

type DeviceCrypto = {
  getRandomValues: <T extends ArrayBufferView>(view: T) => T
  randomUUID: () => string
}

function readCrypto() {
  const crypto = globalThis.crypto as unknown as Partial<DeviceCrypto> | undefined
  if (
    typeof crypto?.getRandomValues !== 'function' ||
    typeof crypto?.randomUUID !== 'function'
  ) {
    throw new Error(
      `crypto unavailable (getRandomValues: ${typeof crypto?.getRandomValues}, randomUUID: ${typeof crypto?.randomUUID})`
    )
  }
  const first = crypto.randomUUID()
  const second = crypto.randomUUID()
  const fill = new Uint8Array(16)
  crypto.getRandomValues(fill)
  const random = Array.from(fill, (byte) => byte.toString(16).padStart(2, '0')).join('')
  return { first, second, random }
}

// microseconds per call over a fixed workload, for comparing against other
// crypto libraries with the same loops.
function bench(): string {
  const crypto = globalThis.crypto as unknown as DeviceCrypto
  const count = 10000
  const perCall = (start: number) =>
    `${(((performance.now() - start) * 1000) / count).toFixed(2)}us`
  let start = performance.now()
  for (let index = 0; index < count; index++) crypto.randomUUID()
  const uuid = perCall(start)
  const small = new Uint8Array(16)
  start = performance.now()
  for (let index = 0; index < count; index++) crypto.getRandomValues(small)
  const values16 = perCall(start)
  const large = new Uint8Array(4096)
  start = performance.now()
  for (let index = 0; index < count; index++) crypto.getRandomValues(large)
  return `uuid ${uuid} values16 ${values16} values4096 ${perCall(start)}`
}

// One.Crypto known-answer labels: SHA-256 and MD5 digests of "abc", plus an
// AES-GCM seal/open round trip whose sealed bytes are rebuilt through
// AESSealedData.fromCombined before opening. a tampered tag must fail.
async function runCryptoChecks(report: (label: string) => void) {
  const sha = await One.Crypto.digestString('SHA-256', 'abc')
  report(`Digest: ${sha === 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad' ? 'match' : sha}`)
  const md5 = await One.Crypto.digestString('MD5', 'abc')
  report(`MD5: ${md5 === '900150983cd24fb0d6963f7d28e17f72' ? 'match' : md5}`)
  const key = await AESEncryptionKey.generate()
  const sealed = await One.Crypto.aesEncrypt(new Uint8Array([1, 2, 3]), key)
  const rebuilt = AESSealedData.fromCombined(await sealed.combined())
  const opened = await One.Crypto.aesDecrypt(rebuilt, key)
  report(`AES: ${opened.length === 3 && opened[0] === 1 && opened[2] === 3 ? 'match' : 'mismatch'}`)
  const combined = await sealed.combined()
  combined[combined.length - 1] ^= 1
  try {
    await One.Crypto.aesDecrypt(AESSealedData.fromCombined(combined), key)
    report('Tamper: accepted')
  } catch {
    report('Tamper: rejected')
  }
}

function readState() {
  try {
    return { ...readCrypto(), error: 'none' }
  } catch (e) {
    return {
      first: 'missing',
      second: 'missing',
      random: 'missing',
      error: e instanceof Error ? e.message : String(e),
    }
  }
}

export default function OneNativeCrypto() {
  // the public api has no availability probe by convention, so the fixture
  // asks the nitro registry directly for its marker. a web bundle has no
  // NitroModules, which throws and reads unavailable, correctly.
  const [available] = useState(() => {
    try {
      return NitroModules.hasHybridObject('OneCrypto')
    } catch {
      return false
    }
  })
  const [state, setState] = useState(readState)
  const [timings, setTimings] = useState('not run')
  const [checks, setChecks] = useState<string[]>([])
  const regenerate = useCallback(() => {
    setState(readState())
  }, [])
  const valid = UUID_V4.test(state.first) && UUID_V4.test(state.second)
  const distinct = state.first !== state.second && state.first !== 'missing'

  return (
    <View style={styles.screen}>
      <Text>{`Module: ${available ? 'available' : 'unavailable'}`}</Text>
      <Text>{`UUID1: ${state.first}`}</Text>
      <Text>{`UUID2: ${state.second}`}</Text>
      <Text>{`Random: ${state.random}`}</Text>
      <Text>{`Valid: ${valid ? 'v4' : 'no'}`}</Text>
      <Text>{`Distinct: ${distinct ? 'true' : 'false'}`}</Text>
      <Text>{`Error: ${state.error}`}</Text>
      <Text>{`Bench: ${timings}`}</Text>
      {checks.map((check) => (
        <Text key={check}>{check}</Text>
      ))}
      <Pressable
        testID="one-native-crypto-regenerate"
        style={styles.chip}
        onPress={regenerate}
      >
        <Text>Regenerate</Text>
      </Pressable>
      <Pressable
        testID="one-native-crypto-checks"
        style={styles.chip}
        onPress={() => {
          setChecks([])
          runCryptoChecks((label) => setChecks((current) => [...current, label])).catch(
            (error: unknown) =>
              setChecks([`ChecksError: ${error instanceof Error ? error.message : String(error)}`])
          )
        }}
      >
        <Text>Run digest and AES checks</Text>
      </Pressable>
      <Pressable
        testID="one-native-crypto-bench"
        style={styles.chip}
        onPress={() => setTimings(bench())}
      >
        <Text>Run crypto benchmark</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16, gap: 8 },
  chip: { padding: 12, backgroundColor: '#eee', borderRadius: 8 },
})
