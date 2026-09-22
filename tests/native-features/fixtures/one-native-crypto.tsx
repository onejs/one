import { useCallback, useState } from 'react'
import { Pressable, StyleSheet, Text, TurboModuleRegistry, View } from 'react-native'
import type { TurboModule } from 'react-native'

// exercises the One crypto polyfill end to end: two randomUUIDs plus a
// getRandomValues fill, all rendered as labels because RN Text testIDs
// vanish from the accessibility snapshot while Pressable IDs survive. the
// module marker proves the native side resolved; Valid/Distinct mirror
// what the conformance scripts re-check from the raw labels.
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
  // reads the registry directly for its marker. a web bundle has no
  // TurboModuleRegistry, which throws and reads unavailable, correctly.
  const [available] = useState(() => {
    try {
      return TurboModuleRegistry.get<TurboModule>('OneNativeCrypto') != null
    } catch {
      return false
    }
  })
  const [state, setState] = useState(readState)
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
      <Pressable
        testID="one-native-crypto-regenerate"
        style={styles.chip}
        onPress={regenerate}
      >
        <Text>Regenerate</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16, gap: 8 },
  chip: { padding: 12, backgroundColor: '#eee', borderRadius: 8 },
})
