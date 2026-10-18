import { useRef, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { CBCentralManager } from 'one/ios/CoreBluetooth'
import { HKHealthStore, HKObjectType, HKQuantityTypeIdentifier } from 'one/ios/HealthKit'
import { WeatherService } from 'one/ios/WeatherKit'
import { LanguageModelSession, SystemLanguageModel } from 'one/ios/FoundationModels'

// one call into each of four frameworks of different shapes, through the
// bindings prebuild generates from the sdk
function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

async function settle(report: (name: string, value: string) => void, name: string, run: () => Promise<string>) {
  try {
    report(name, await run())
  } catch (error) {
    report(name, `error ${message(error)}`)
  }
}

export default function OneNativeIosSdk() {
  const [results, setResults] = useState<Record<string, string>>({})
  const [status, setStatus] = useState('idle')
  const bluetooth = useRef<CBCentralManager | null>(null)
  const report = (name: string, value: string) => setResults((current) => ({ ...current, [name]: value }))

  const run = async () => {
    setResults({})
    setStatus('running')
    // a delegate is a javascript object; the manager calls it once it knows its state
    bluetooth.current = CBCentralManager.initDelegateQueue(
      { centralManagerDidUpdateState: (central) => report('Bluetooth', central.state) },
      null
    )
    await settle(report, 'HealthAvailable', async () => String(HKHealthStore.isHealthDataAvailable()))
    await settle(report, 'HealthStatus', async () => {
      const steps = HKObjectType.quantityType(HKQuantityTypeIdentifier.stepCount)
      if (!steps) return 'no step type'
      return `${steps.identifier} ${HKHealthStore.init().authorizationStatus(steps)}`
    })
    await settle(report, 'Weather', async () => (await WeatherService.shared.attribution).serviceName)
    const model = SystemLanguageModel.default
    report('ModelAvailable', String(model.isAvailable))
    if (model.isAvailable) {
      await settle(report, 'Model', async () => {
        const session = LanguageModelSession.initModelInstructions417(undefined, 'Answer in one word.')
        const response = await session.respondToOptions432('What color is a clear daytime sky?')
        return `${String(response.content)} (${response.rawContent.jsonString})`
      })
      // the caller picks the generic Content type, so the model answers as an Int
      await settle(report, 'ModelInt', async () => {
        const session = LanguageModelSession.initModelInstructions417(undefined, 'Answer with a number.')
        const response = await session.respondToGeneratingOptionsContextOptionsMetadata424('How many legs does a spider have?', 'Int')
        return `${typeof response.content} ${String(response.content)} (${response.rawContent.jsonString})`
      })
    }
    setStatus('done')
  }

  return (
    <View style={styles.screen}>
      <Text testID="one-native-ios-sdk-status">{`Status: ${status}`}</Text>
      {Object.entries(results).map(([name, value]) => (
        <Text key={name} testID={`one-native-ios-sdk-${name}`}>{`${name}: ${value}`}</Text>
      ))}
      <Pressable
        testID="one-native-ios-sdk-run"
        style={styles.chip}
        onPress={() => run().catch((error: unknown) => setStatus(`failed ${message(error)}`))}
      >
        <Text>Run SDK checks</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16, gap: 6, backgroundColor: '#fff' },
  chip: { padding: 10, borderRadius: 8, backgroundColor: '#e5e7eb', alignSelf: 'flex-start' },
})
