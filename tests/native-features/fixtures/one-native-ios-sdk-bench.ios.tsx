import { useMemo, useState } from 'react'
import { Pressable, ScrollView, Text } from 'react-native'
import { NitroModules } from 'react-native-nitro-modules'
import { ProcessInfo, Progress, UserDefaults } from 'one/ios/Foundation'
import { HKObjectType, HKQuantityTypeIdentifier } from 'one/ios/HealthKit'
import { useSDKProperty } from 'one/ios-runtime'
import type { OneStorage } from '../../../packages/one/src/platform/specs/OneStorage.nitro'
import type { OneBattery } from '../../../packages/one/src/platform/specs/OneBattery.nitro'

const iterations = 10000
function measure(run: () => unknown) {
  for (let i = 0; i < 500; i++) run()
  const samples: number[] = []
  for (let batch = 0; batch < 5; batch++) {
    const start = performance.now()
    for (let i = 0; i < iterations; i++) run()
    samples.push((performance.now() - start) * 1000 / iterations)
  }
  return samples.sort((a, b) => a - b)[2].toFixed(3)
}

async function measureAsync(run: () => Promise<unknown>) {
  for (let i = 0; i < 500; i++) await run()
  const samples: number[] = []
  for (let batch = 0; batch < 5; batch++) {
    const start = performance.now()
    for (let i = 0; i < iterations; i++) await run()
    samples.push((performance.now() - start) * 1000 / iterations)
  }
  return samples.sort((a, b) => a - b)[2].toFixed(3)
}

async function valueBenchmark() {
  const battery = NitroModules.createHybridObject<OneBattery>('OneBattery')
  const storage = NitroModules.createHybridObject<OneStorage>('OneStorage')
  const process = ProcessInfo.processInfo
  const defaults = UserDefaults.standard
  const quantity = HKObjectType.quantityType(HKQuantityTypeIdentifier.stepCount)!
  const key = 'one.sdk.benchmark.s51004'
  storage.setItem(key, 'benchmark')
  defaults.setForKey4377('benchmark', key)
  try {
    return [
      `Nitro HK string getter: ${measure(() => quantity.identifier)} us`,
      `SDK low power getter: ${measure(() => process.isLowPowerModeEnabled)} us`,
      `Direct low power (async): ${await measureAsync(() => battery.isLowPowerModeEnabled())} us`,
      `SDK string key method: ${measure(() => defaults.string(key))} us`,
      `Direct string key method: ${measure(() => storage.getItem(key))} us`,
      `SDK two strings: ${measure(() => defaults.setForKey4377('benchmark', key))} us`,
      `Direct two strings: ${measure(() => storage.setItem(key, 'benchmark'))} us`,
    ].join('\n')
  } finally {
    defaults.removeObject(key)
    storage.removeItem(key)
  }
}

function ObservedProgress({ progress }: { progress: Progress }) {
  const state = useSDKProperty(progress, 'fractionCompleted')
  return <Text testID="sdk-observation-value">{state.status === 'error'
    ? `Observation error: ${state.error.message}`
    : `Observed progress: ${state.value ?? 'pending'}`}</Text>
}

function ObservedSingleton() {
  const [renders, setRenders] = useState(0)
  const object = ProcessInfo.processInfo
  const state = useSDKProperty(object, 'thermalState')
  return <>
    <Text testID="sdk-singleton-value">{state.status === 'error'
      ? `Singleton error: ${state.error.message}`
      : `Singleton thermal: ${state.value ?? 'pending'}`}</Text>
    <Text>{`Singleton renders requested: ${renders}`}</Text>
    <Pressable testID="sdk-singleton-render" onPress={() => setRenders((value) => value + 1)}>
      <Text>Render singleton again</Text>
    </Pressable>
    <Text testID="sdk-singleton-identity">{`Singleton identity: ${object === ProcessInfo.processInfo ? 'stable' : 'changed'}`}</Text>
  </>
}

export default function OneNativeIosSdkBench() {
  const [result, setResult] = useState('Ready')
  const progress = useMemo(() => Progress.initTotalUnitCount(4), [])
  const [mounted, setMounted] = useState(true)
  return (
    <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
      <Text>SDK transport and observation</Text>
      <Text testID="sdk-bench-result">{result}</Text>
      <Pressable testID="sdk-bench-values" onPress={async () => {
        try { setResult(await valueBenchmark()) }
        catch (error) { setResult(String(error)) }
      }}><Text>Measure Nitro values</Text></Pressable>
      {mounted ? <><ObservedProgress progress={progress} /><ObservedSingleton /></> : <Text>Observation unmounted</Text>}
      <Pressable testID="sdk-observation-increment" onPress={() => { progress.completedUnitCount += 1 }}>
        <Text>Advance native progress</Text>
      </Pressable>
      <Pressable testID="sdk-observation-toggle" onPress={() => setMounted((value) => !value)}>
        <Text>Toggle observation</Text>
      </Pressable>
    </ScrollView>
  )
}
