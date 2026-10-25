import { useRef, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import ProofPage, { type ProofMethods } from './dom/ProofPage'

export default function OneDOMFixture() {
  const [revision, setRevision] = useState(0)
  const [visible, setVisible] = useState(true)
  const [result, setResult] = useState('none')
  const first = useRef<ProofMethods>(null)
  const delayed = useRef<Array<() => void>>([])

  async function readRef(action: () => Promise<unknown> | undefined) {
    try {
      const value = await action()
      setResult(value === undefined ? 'void success' : String(value))
    } catch (error) {
      setResult(error instanceof Error ? error.message : String(error))
    }
  }

  function actions(instance: string) {
    return {
      onValue: async (text: string) => `${instance}:${text}:revision-${revision}`,
      onVoid: async () => {
        setResult(`void from ${instance}`)
      },
      onReject: async () => {
        throw new Error(`native rejection from ${instance}`)
      },
      onDelay: (text: string) =>
        new Promise<string>((resolve) => {
          delayed.current.push(() => resolve(`delayed ${instance}:${text}`))
          setResult(`pending from ${instance}`)
        }),
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <Text style={styles.title}>One DOM components</Text>
      <Text testID="one-dom-native-result">Native result: {result}</Text>
      <View style={styles.actions}>
        <Pressable
          testID="one-dom-update"
          onPress={() => setRevision((value) => value + 1)}
          style={styles.button}
        >
          <Text>Update native props</Text>
        </Pressable>
        <Pressable
          testID="one-dom-toggle"
          onPress={() => setVisible((value) => !value)}
          style={styles.button}
        >
          <Text>{visible ? 'Unmount first' : 'Mount first'}</Text>
        </Pressable>
        <Pressable
          testID="one-dom-resolve"
          onPress={() => {
            for (const resolve of delayed.current.splice(0)) resolve()
          }}
          style={styles.button}
        >
          <Text>Resolve delayed actions</Text>
        </Pressable>
        <Pressable
          testID="one-dom-ref-read"
          onPress={() => void readRef(() => first.current?.read())}
          style={styles.button}
        >
          <Text>Read first ref</Text>
        </Pressable>
        <Pressable
          testID="one-dom-ref-clear"
          onPress={() => void readRef(() => first.current?.clear())}
          style={styles.button}
        >
          <Text>Clear first ref</Text>
        </Pressable>
        <Pressable
          testID="one-dom-ref-fail"
          onPress={() => void readRef(() => first.current?.fail())}
          style={styles.button}
        >
          <Text>Reject first ref</Text>
        </Pressable>
      </View>
      {visible && (
        <ProofPage
          ref={first}
          instance="first"
          label={`native revision ${revision}`}
          {...actions('first')}
          dom={{
            matchContents: true,
            scrollEnabled: false,
            onError: (error) => setResult(error.message),
          }}
        />
      )}
      <ProofPage
        instance="second"
        label={`native revision ${revision}`}
        {...actions('second')}
        dom={{
          matchContents: true,
          scrollEnabled: false,
          onError: (error) => setResult(error.message),
        }}
      />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  screen: { padding: 16, gap: 12 },
  title: { fontSize: 22, fontWeight: '600' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  button: { padding: 10, backgroundColor: '#e2e8f0', borderRadius: 6 },
})
