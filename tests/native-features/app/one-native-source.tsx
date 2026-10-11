import { useState } from 'react'
import { Text, TouchableOpacity, View } from 'react-native'
import { runNativeSource } from '../fixtures/one-native-source'
import { runNativePayloads, runNativePayloadsInvalid } from '../fixtures/one-native-payloads'
import { runNativeEvents, runNativeEventsInvalid } from '../fixtures/one-native-events'

export default function NativeSourceFixture() {
  const [result, setResult] = useState('ready')
  const [payloads, setPayloads] = useState('ready')
  const [invalid, setInvalid] = useState('ready')
  const [events, setEvents] = useState('ready')
  const [eventsInvalid, setEventsInvalid] = useState('ready')
  return <View>
    <TouchableOpacity testID="native-source-run" accessibilityRole="button" accessibilityLabel="Run native source" onPress={() => {
      runNativeSource().then(setResult, (error: unknown) => setResult(String(error)))
    }}>
      <Text>Run native source</Text>
    </TouchableOpacity>
    <Text testID="native-source-result">{result}</Text>
    <TouchableOpacity testID="native-payloads-run" accessibilityRole="button" accessibilityLabel="Run native payloads" onPress={() => {
      runNativePayloads().then(setPayloads, (error: unknown) => setPayloads(String(error)))
    }}>
      <Text>Run native payloads</Text>
    </TouchableOpacity>
    <Text testID="native-payloads-result">{payloads}</Text>
    <TouchableOpacity testID="native-payloads-invalid-run" accessibilityRole="button" accessibilityLabel="Run invalid native payload" onPress={() => {
      runNativePayloadsInvalid().then(setInvalid, (error: unknown) => setInvalid(String(error)))
    }}>
      <Text>Run invalid native payload</Text>
    </TouchableOpacity>
    <Text testID="native-payloads-invalid-result">{invalid}</Text>
    <TouchableOpacity testID="native-events-run" accessibilityRole="button" accessibilityLabel="Run native events" onPress={() => {
      runNativeEvents().then(setEvents, (error: unknown) => setEvents(String(error)))
    }}>
      <Text>Run native events</Text>
    </TouchableOpacity>
    <Text testID="native-events-result">{events}</Text>
    <TouchableOpacity testID="native-events-invalid-run" accessibilityRole="button" accessibilityLabel="Run invalid native event" onPress={() => {
      runNativeEventsInvalid().then(setEventsInvalid, (error: unknown) => setEventsInvalid(String(error)))
    }}>
      <Text>Run invalid native event</Text>
    </TouchableOpacity>
    <Text testID="native-events-invalid-result">{eventsInvalid}</Text>
  </View>
}
