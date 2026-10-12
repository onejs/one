import { useRef, useState } from 'react'
import { One } from 'one'
import { Pressable, Text, View } from 'react-native'

export default function DataScannerFixture() {
  const scanner = useRef<InstanceType<typeof One.iOS.DataScannerViewController> | null>(
    null
  )
  const [supported] = useState(() => One.iOS.DataScannerViewController.isSupported)
  const [available] = useState(() => One.iOS.DataScannerViewController.isAvailable)
  const [state, setState] = useState('idle')
  const [error, setError] = useState('-')
  const [items, setItems] = useState(0)
  const run = async (operation: 'present' | 'start') => {
    try {
      const controller = (scanner.current ??= new One.iOS.DataScannerViewController({
        recognizedDataTypes: [
          One.iOS.DataScannerViewController.RecognizedDataType.text(),
          One.iOS.DataScannerViewController.RecognizedDataType.barcode(),
        ],
      }))
      controller.delegate = {
        dataScanner: (_sender, event) => {
          if ('allItems' in event) setItems(event.allItems.length)
          if ('becameUnavailableWithError' in event)
            setError(event.becameUnavailableWithError)
        },
      }
      if (operation === 'present') {
        await controller.present()
        controller.startScanning()
      } else controller.startScanning()
      setState('scanning')
    } catch (failure) {
      setError((failure as { code?: string }).code ?? String(failure))
      setState('rejected')
    }
  }
  return (
    <View testID="data-scanner-screen" style={{ padding: 24, gap: 20 }}>
      <Text testID="data-scanner-supported">{`Supported: ${supported}`}</Text>
      <Text testID="data-scanner-available">{`Available: ${available}`}</Text>
      <Text testID="data-scanner-state">{`State: ${state}`}</Text>
      <Text testID="data-scanner-error">{`Error: ${error}`}</Text>
      <Text testID="data-scanner-items">{`Items: ${items}`}</Text>
      <Pressable testID="data-scanner-present" onPress={() => run('present')}>
        <Text>Present scanner</Text>
      </Pressable>
      <Pressable testID="data-scanner-start" onPress={() => run('start')}>
        <Text>Start scanning</Text>
      </Pressable>
      <Pressable
        testID="data-scanner-dismiss"
        onPress={() => {
          void scanner.current?.dismiss()
          setState('dismissed')
        }}
      >
        <Text>Dismiss scanner</Text>
      </Pressable>
    </View>
  )
}
