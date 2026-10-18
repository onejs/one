import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { One } from 'one'
import { NotificationCenter, NSNotification_Name } from 'one/ios/Foundation'
import { NitroModules } from 'react-native-nitro-modules'
import type { OneBrightness } from '../../../packages/one/src/platform/specs/OneBrightness.nitro'

export default function BrightnessMigrationControl() {
  const [result, setResult] = useState('idle')
  const [rows, setRows] = useState<string[]>([])
  const report = (text: string) => setRows((current) => [...current, text])
  async function run() {
    const legacy = NitroModules.createHybridObject<OneBrightness>('OneBrightness')
    const initial = await legacy.get()
    const sdkEvents: number[] = []
    const legacyEvents: number[] = []
    const sdkSub = One.Brightness.addListener((event) => sdkEvents.push(event.brightness))
    const removeLegacy = legacy.addListener((event) => legacyEvents.push(event.brightness))
    try {
      await One.Brightness.set(0.4)
      const sdkValue = await One.Brightness.get()
      const legacyValue = await legacy.get()
      await new Promise((resolve) => setTimeout(resolve, 1500))
      report(`SDK04: ${sdkValue}`)
      report(`Legacy04: ${legacyValue}`)
      report(`ReadParity: ${sdkValue === legacyValue}`)
      report(`SDKEvents: ${sdkEvents.length}`)
      report(`LegacyEvents: ${legacyEvents.length}`)
      report(`EventParity: ${JSON.stringify(sdkEvents) === JSON.stringify(legacyEvents)}`)
    } finally {
      sdkSub.remove()
      removeLegacy()
      await One.Brightness.set(initial)
    }
    const center = NotificationCenter.default
    const name = NSNotification_Name.initRawValue('OneUnifiedBrightnessMigrationProbe')
    let count = 0
    let received: () => void = () => {}
    const delivered = new Promise<void>((resolve) => { received = resolve })
    const token = center.addObserver(name, null, null, () => { count++; received() })
    center.postNameObject(name)
    await delivered
    center.removeObserver(token)
    center.postNameObject(name)
    await new Promise((resolve) => setTimeout(resolve, 0))
    report(`GeneratedObserver: ${count === 1}`)
  }
  return <View style={{ flex: 1, backgroundColor: 'white', padding: 16, gap: 8 }}>
    <Text>{`Control: ${result}`}</Text>
    {rows.map((row) => <Text key={row}>{row}</Text>)}
    <Pressable testID="one-brightness-control-run" onPress={() => {
      setRows([])
      setResult('running')
      run().then(() => setResult('done'), (error) => setResult(String(error)))
    }}><Text>Run brightness control</Text></Pressable>
  </View>
}
