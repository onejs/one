import { useRef, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { One } from 'one'

const documents = [
  '<!doctype html><meta name="viewport" content="width=device-width"><title>Local A</title><body style="background:#D9F0D1;font:18px -apple-system"><h1>Document A</h1><p>First local page</p></body>',
  '<!doctype html><meta name="viewport" content="width=device-width"><title>Local B</title><body style="background:#D7E6FF;font:18px -apple-system"><h1>Document B</h1><p>Second local page</p></body>',
]

export default function OneNativeWebPhotos() {
  const [category, setCategory] = useState<'Web' | 'Photos'>('Web')
  const [documentIndex, setDocumentIndex] = useState(0)
  const [webTitle, setWebTitle] = useState('')
  const [webURL, setWebURL] = useState('')
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [webEvents, setWebEvents] = useState(0)
  const [picked, setPicked] = useState({ url: '', index: -1, count: 0 })
  const [pickError, setPickError] = useState('')
  const [webMessage, setWebMessage] = useState('')
  const [webHistory, setWebHistory] = useState('false/false')
  const commandRevision = useRef(0)
  const [command, setCommand] = useState({ command: '' as '' | 'reload' | 'goBack' | 'evaluate', revision: 0, value: '' })
  const run = (next: 'reload' | 'goBack' | 'evaluate', value = '') => {
    commandRevision.current += 1
    setCommand({ command: next, revision: commandRevision.current, value })
  }

  return (
    <View style={styles.screen} testID="one-native-web-photos-screen">
      <Text>{`Category: ${category}`}</Text>
      <Pressable testID="one-native-web-photos-web-tab" onPress={() => setCategory('Web')}>
        <Text>Web</Text>
      </Pressable>
      <Pressable testID="one-native-web-photos-photos-tab" onPress={() => setCategory('Photos')}>
        <Text>Photos</Text>
      </Pressable>
      {category === 'Web' ? (
        <>
          <Text>{`Document index: ${documentIndex}`}</Text>
          <Text>{`Web title: ${webTitle}`}</Text>
          <Text>{`Web URL: ${webURL}`}</Text>
          <Text>{`Web loading: ${loading}`}</Text>
          <Text>{`Web progress: ${Math.round(progress * 100)}`}</Text>
          <Text>{`Web loading events: ${webEvents}`}</Text>
          <Text>{`Web message: ${webMessage}`}</Text>
          <Text>{`Web history: ${webHistory}`}</Text>
          <Pressable testID="one-native-web-photos-swap" onPress={() => setDocumentIndex((value) => value === 0 ? 1 : 0)}>
            <Text>Swap document</Text>
          </Pressable>
          <Pressable
            testID="one-native-web-photos-ping"
            onPress={() => run('evaluate', "window.ReactNativeWebView.postMessage('ping')")}
          >
            <Text>Ping</Text>
          </Pressable>
          <Pressable testID="one-native-web-photos-back" onPress={() => run('goBack')}>
            <Text>Back</Text>
          </Pressable>
          <One.iOS.WebView
            html={documents[documentIndex]}
            command={command.command}
            commandRevision={command.revision}
            commandValue={command.value}
            style={{ height: 260 }}
            testID="one-native-web-photos-webview"
            onLoadingChange={(value, amount) => {
              setLoading(value)
              setProgress(amount)
              setWebEvents((count) => count + 1)
            }}
            onMessage={setWebMessage}
            onNavigate={setWebURL}
            onTitleChange={setWebTitle}
            onHistoryChange={(canGoBack, canGoForward) =>
              setWebHistory(`${canGoBack}/${canGoForward}`)
            }
          />
        </>
      ) : (
        <>
          <Text>{`Picked count: ${picked.count}`}</Text>
          <Text>{`Picked index: ${picked.index}`}</Text>
          <Text>{`Picked URL: ${picked.url}`}</Text>
          <Text>{`Pick error: ${pickError}`}</Text>
          <One.iOS.PhotosPicker
            filter="images"
            label="Choose photo"
            maxSelectionCount={1}
            style={{ width: 160 }}
            systemImage="photo.on.rectangle"
            testID="one-native-web-photos-picker"
            onPick={(url, index, count) => setPicked({ url, index, count })}
            onPickError={setPickError}
          />
        </>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 16, paddingTop: 90, gap: 10, backgroundColor: '#F5F5F7' },
})
