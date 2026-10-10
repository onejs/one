import { useEffect, useRef, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { One } from 'one'

// drives One.Speech sessions and logs each session's events by name, so the
// suite can prove a replaced or aborted session never hears another event.
// results travel as labels because RN Text testIDs vanish from the
// accessibility snapshot while Pressable IDs survive.
export default function OneNativeSpeech() {
  const [permission, setPermission] = useState('none')
  const [log, setLog] = useState<Record<string, string[]>>({})
  const [transcript, setTranscript] = useState('')
  const [message, setMessage] = useState('')
  const session = useRef<ReturnType<typeof One.Speech.start> | null>(null)

  useEffect(() => {
    One.Speech.getPermissions().then((response) => setPermission(response.status))
    return () => session.current?.abort()
  }, [])

  const start = (name: string) => {
    setLog((current) => ({ ...current, [name]: [] }))
    session.current = One.Speech.start({ lang: 'en-US' }, (event) => {
      const entry = event.type === 'error' ? `error:${event.error}` : event.type
      setLog((current) => {
        const events = current[name] ?? []
        // transcripts stream; log the first so the list stays readable
        if (entry === 'transcript' && events.at(-1) === 'transcript') return current
        return { ...current, [name]: [...events, entry] }
      })
      setTranscript(event.transcript)
      if (event.message) setMessage(event.message)
    })
  }

  return (
    <View style={styles.screen}>
      <Text>{`Available: ${One.Speech.isAvailable()}`}</Text>
      <Text>{`Permission: ${permission}`}</Text>
      <Text>{`A: ${(log.A ?? []).join(',')}`}</Text>
      <Text>{`B: ${(log.B ?? []).join(',')}`}</Text>
      <Text>{`Transcript: ${transcript}`}</Text>
      <Text>{`Message: ${message}`}</Text>
      <Pressable
        testID="one-native-speech-request"
        style={styles.chip}
        onPress={async () => setPermission((await One.Speech.requestPermissions()).status)}
      >
        <Text>Request permission</Text>
      </Pressable>
      <Pressable testID="one-native-speech-start" style={styles.chip} onPress={() => start('A')}>
        <Text>Start A</Text>
      </Pressable>
      <Pressable testID="one-native-speech-replace" style={styles.chip} onPress={() => start('B')}>
        <Text>Start B</Text>
      </Pressable>
      <Pressable
        testID="one-native-speech-replace-now"
        style={styles.chip}
        onPress={() => {
          start('A')
          start('B')
        }}
      >
        <Text>Start A then B</Text>
      </Pressable>
      <Pressable
        testID="one-native-speech-abort-now"
        style={styles.chip}
        onPress={() => {
          start('A')
          session.current?.abort()
        }}
      >
        <Text>Start A then abort</Text>
      </Pressable>
      <Pressable
        testID="one-native-speech-stop"
        style={styles.chip}
        onPress={() => session.current?.stop()}
      >
        <Text>Stop</Text>
      </Pressable>
      <Pressable
        testID="one-native-speech-abort"
        style={styles.chip}
        onPress={() => session.current?.abort()}
      >
        <Text>Abort</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16, gap: 12 },
  chip: { padding: 12, backgroundColor: '#eee', borderRadius: 8 },
})
