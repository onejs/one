import { useMemo, useState } from 'react'
import { Pressable, ScrollView, Text } from 'react-native'
import { NitroModules } from 'react-native-nitro-modules'
import { Bundle, Data, ProcessInfo, Progress, UserDefaults } from 'one/ios/Foundation'
import { HKObjectType, HKQuantityTypeIdentifier } from 'one/ios/HealthKit'
import { NSCoder, UIGraphicsSetPDFContextDestinationForRect } from 'one/ios/UIKit'
import { useSDKProperty } from 'one/ios-runtime'
import type { OneStorage } from '../../../packages/one/src/platform/specs/OneStorage.nitro'
import type { OneBattery } from '../../../packages/one/src/platform/specs/OneBattery.nitro'
import type { OneUpdates } from '../../../packages/one/src/platform/specs/OneUpdates.nitro'

const iterations = 10000
function allocatedBytes(): number | undefined {
  const stats = (globalThis as any).HermesInternal?.getInstrumentedStats?.()
  if (!stats) return undefined
  return typeof stats.js_totalAllocatedBytes === 'number'
    ? stats.js_totalAllocatedBytes
    : typeof stats.js_allocatedBytes === 'number'
      ? stats.js_allocatedBytes
      : undefined
}

function measure(run: () => unknown) {
  for (let i = 0; i < 500; i++) run()
  const samples: number[] = []
  const allocs: number[] = []
  for (let batch = 0; batch < 5; batch++) {
    const startBytes = allocatedBytes()
    const start = performance.now()
    for (let i = 0; i < iterations; i++) run()
    samples.push(((performance.now() - start) * 1000) / iterations)
    const endBytes = allocatedBytes()
    if (startBytes !== undefined && endBytes !== undefined) {
      allocs.push(Math.max(0, Math.round((endBytes - startBytes) / iterations)))
    }
  }
  const us = samples.sort((a, b) => a - b)[2].toFixed(3)
  const alloc = allocs.length ? ` (${allocs.sort((a, b) => a - b)[2]} B/call)` : ''
  return `${us} us${alloc}`
}

async function measureAsync(run: () => Promise<unknown>) {
  for (let i = 0; i < 500; i++) await run()
  const samples: number[] = []
  const allocs: number[] = []
  for (let batch = 0; batch < 5; batch++) {
    const startBytes = allocatedBytes()
    const start = performance.now()
    for (let i = 0; i < iterations; i++) await run()
    samples.push(((performance.now() - start) * 1000) / iterations)
    const endBytes = allocatedBytes()
    if (startBytes !== undefined && endBytes !== undefined) {
      allocs.push(Math.max(0, Math.round((endBytes - startBytes) / iterations)))
    }
  }
  const us = samples.sort((a, b) => a - b)[2].toFixed(3)
  const alloc = allocs.length ? ` (${allocs.sort((a, b) => a - b)[2]} B/call)` : ''
  return `${us} us${alloc}`
}

async function valueBenchmark() {
  const battery = NitroModules.createHybridObject<OneBattery>('OneBattery')
  const storage = NitroModules.createHybridObject<OneStorage>('OneStorage')
  const updates = NitroModules.createHybridObject<OneUpdates>('OneUpdates')
  const process = ProcessInfo.processInfo
  const bundle = Bundle.main
  const defaults = UserDefaults.standard
  const quantity = HKObjectType.quantityType(HKQuantityTypeIdentifier.stepCount)!
  const key = 'one.sdk.benchmark.s51004'
  const rect = { x: 1, y: 2, width: 30, height: 40 }
  const payload = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]).buffer
  storage.setItem(key, 'benchmark')
  defaults.setForKey83917('benchmark', key)
  try {
    return [
      `Nitro HK string getter: ${measure(() => quantity.identifier)}`,
      `SDK low power getter: ${measure(() => process.isLowPowerModeEnabled)}`,
      `Direct Swift bool getter: ${measure(() => updates.isEnabled)}`,
      `Direct low power (async): ${await measureAsync(() => battery.isLowPowerModeEnabled())}`,
      `SDK bundle info read: ${measure(() => bundle.object('OneUpdatesRuntimeVersion'))}`,
      `Direct Swift bundle getter: ${measure(() => updates.runtimeVersion)}`,
      `SDK struct+string call: ${measure(() => UIGraphicsSetPDFContextDestinationForRect('bench', rect))}`,
      `SDK CGRect->string call: ${measure(() => NSCoder.stringFor72204(rect))}`,
      `SDK string key method: ${measure(() => defaults.string(key))}`,
      `Direct string key method: ${measure(() => storage.getItem(key))}`,
      `SDK two strings: ${measure(() => defaults.setForKey83917('benchmark', key))}`,
      `Direct two strings: ${measure(() => storage.setItem(key, 'benchmark'))}`,
      `SDK ArrayBuffer round-trip: ${measure(() => Data.init77651(payload))}`,
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
