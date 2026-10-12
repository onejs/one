import { useEffect, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { One } from 'one'

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function withTimeout<T>(promise: Promise<T>, ms: number, name: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${name} timed out`)), ms)
    ),
  ])
}

async function runChecks(report: (name: string, value: string) => void) {
  const synthesis = One.SpeechSynthesis
  report('MaxInputLength', String(synthesis.maxInputLength))
  const voices = await synthesis.getAvailableVoices()
  report('Voices', String(voices.length))
  const malformed = voices.filter(
    (voice) =>
      typeof voice.identifier !== 'string' ||
      typeof voice.language !== 'string' ||
      typeof voice.name !== 'string' ||
      (voice.quality !== 'default' && voice.quality !== 'enhanced')
  )
  report('MalformedVoices', String(malformed.length))
  report('Speaking', String(await synthesis.isSpeaking()))
  const events: string[] = []
  await withTimeout(
    new Promise<void>((resolve, reject) => {
      synthesis.speak('one native speech synthesis probe', {
        onStart: () => events.push('start'),
        onDone: () => {
          events.push('done')
          resolve()
        },
        onStopped: () => reject(new Error('utterance was stopped')),
        onError: (error) => reject(error),
      })
    }),
    20000,
    'speak'
  )
  report('Events', events.join(','))
  await synthesis.stop()
  report('Quiet', String(await synthesis.isSpeaking()))
  try {
    Reflect.apply(synthesis.speak, undefined, [''])
    report('Invalid', 'accepted')
  } catch (error) {
    report('Invalid', message(error))
  }
}

export default function OneNativeSpeechSynthesis() {
  const [results, setResults] = useState<[string, string][]>([])
  const [status, setStatus] = useState('idle')
  // TTS pre-warm experiment (bounded, fixture-side only): one voices call at
  // mount starts the android engine seconds before the run tap, so the
  // press-time read below measures a warmed engine instead of racing init.
  useEffect(() => {
    const started = Date.now()
    One.SpeechSynthesis.getAvailableVoices().then(
      (voices) => {
        setResults((current) =>
          current.some(([name]) => name === 'WarmVoices')
            ? current
            : [
                ...current,
                ['WarmVoices', String(voices.length)],
                ['WarmMs', String(Date.now() - started)],
              ]
        )
      },
      () => {}
    )
  }, [])

  return (
    <View style={styles.screen}>
      <Text>{`Status: ${status}`}</Text>
      {results.map(([name, value]) => (
        <Text key={name}>{`${name}: ${value}`}</Text>
      ))}
      <Pressable
        testID="one-native-speech-synthesis-run"
        style={styles.chip}
        onPress={() => {
          setResults([])
          setStatus('running')
          runChecks((name, value) =>
            setResults((current) => [...current, [name, value]])
          ).then(
            () => setStatus('done'),
            (error: unknown) => setStatus(`failed ${message(error)}`)
          )
        }}
      >
        <Text>Run speech synthesis checks</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16, gap: 6, backgroundColor: '#fff' },
  chip: {
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#e5e7eb',
    alignSelf: 'flex-start',
  },
})
