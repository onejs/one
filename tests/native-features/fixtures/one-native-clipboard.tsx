import { useEffect, useRef, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native'
import { One } from 'one'

// exercises the clipboard api against the real pasteboard: write a known
// string, read it back, and check presence. results travel as labels
// because RN Text testIDs vanish from the accessibility snapshot while
// Pressable IDs survive. the app reads back its own write, so no os paste
// prompt can appear mid-suite. the second and empty setters exist for the
// android suite's overwrite and empty legs; the read length label makes an
// empty read assertable without depending on trailing-space trimming. the
// image, url, html and listener rows cover the extras family: a 1x1 png
// probe, a url round trip, an html round trip, and a change event fired by
// the fixture's own write.
const probe = 'one-native-clipboard-probe'
const probeSecond = 'one-native-clipboard-probe-2'
const probeImage =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
const probeUrl = 'https://onestack.dev/clipboard-probe'
const probeHtml = '<b>one-native-clipboard-html</b>'

export default function OneNativeClipboard() {
  const [written, setWritten] = useState('none')
  const [read, setRead] = useState('none')
  const [has, setHas] = useState('none')
  const [image, setImage] = useState('none')
  const [hasImage, setHasImage] = useState('none')
  const [url, setUrl] = useState('none')
  const [hasUrl, setHasUrl] = useState('none')
  const [html, setHtml] = useState('none')
  const [event, setEvent] = useState('none')
  const [subscribed, setSubscribed] = useState('none')
  const sub = useRef<{ remove: () => void } | null>(null)

  useEffect(() => {
    return () => {
      sub.current?.remove()
      sub.current = null
    }
  }, [])

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text>{`Written: ${written}`}</Text>
      <Text>{`Read: ${read}`}</Text>
      <Text>{`Read length: ${read === 'none' ? 'none' : read.length}`}</Text>
      <Text>{`Has: ${has}`}</Text>
      <Text>{`Image: ${image}`}</Text>
      <Text>{`HasImage: ${hasImage}`}</Text>
      <Text>{`Url: ${url}`}</Text>
      <Text>{`HasUrl: ${hasUrl}`}</Text>
      <Text>{`Html: ${html}`}</Text>
      <Text>{`Event: ${event}`}</Text>
      <Text>{`Subscribed: ${subscribed}`}</Text>
      <Pressable
        testID="one-native-clipboard-set"
        style={styles.chip}
        onPress={async () => setWritten(String(await One.Clipboard.setString(probe)))}
      >
        <Text>Set probe string</Text>
      </Pressable>
      <Pressable
        testID="one-native-clipboard-set-second"
        style={styles.chip}
        onPress={async () => setWritten(String(await One.Clipboard.setString(probeSecond)))}
      >
        <Text>Set second string</Text>
      </Pressable>
      <Pressable
        testID="one-native-clipboard-set-empty"
        style={styles.chip}
        onPress={async () => setWritten(String(await One.Clipboard.setString('')))}
      >
        <Text>Set empty string</Text>
      </Pressable>
      <Pressable
        testID="one-native-clipboard-get"
        style={styles.chip}
        onPress={async () => setRead(await One.Clipboard.getString())}
      >
        <Text>Get string</Text>
      </Pressable>
      <Pressable
        testID="one-native-clipboard-has"
        style={styles.chip}
        onPress={async () => setHas(String(await One.Clipboard.hasString()))}
      >
        <Text>Has string</Text>
      </Pressable>
      <Pressable
        testID="one-native-clipboard-set-image"
        style={styles.chip}
        onPress={async () => {
          await One.Clipboard.setImage(probeImage)
          setImage('set')
        }}
      >
        <Text>Set probe image</Text>
      </Pressable>
      <Pressable
        testID="one-native-clipboard-get-image"
        style={styles.chip}
        onPress={async () => {
          const next = await One.Clipboard.getImage({ format: 'png' })
          setImage(
            next ? `data:${next.data.slice(0, 22)}:${next.size.width}x${next.size.height}` : 'null'
          )
        }}
      >
        <Text>Get image</Text>
      </Pressable>
      <Pressable
        testID="one-native-clipboard-has-image"
        style={styles.chip}
        onPress={async () => setHasImage(String(await One.Clipboard.hasImage()))}
      >
        <Text>Has image</Text>
      </Pressable>
      <Pressable
        testID="one-native-clipboard-set-url"
        style={styles.chip}
        onPress={async () => {
          await One.Clipboard.setUrl(probeUrl)
          setUrl('set')
        }}
      >
        <Text>Set probe url</Text>
      </Pressable>
      <Pressable
        testID="one-native-clipboard-get-url"
        style={styles.chip}
        onPress={async () => setUrl((await One.Clipboard.getUrl()) ?? 'null')}
      >
        <Text>Get url</Text>
      </Pressable>
      <Pressable
        testID="one-native-clipboard-has-url"
        style={styles.chip}
        onPress={async () => setHasUrl(String(await One.Clipboard.hasUrl()))}
      >
        <Text>Has url</Text>
      </Pressable>
      <Pressable
        testID="one-native-clipboard-set-html"
        style={styles.chip}
        onPress={async () => {
          await One.Clipboard.setString(probeHtml, { inputFormat: 'html' })
          setHtml('set')
        }}
      >
        <Text>Set probe html</Text>
      </Pressable>
      <Pressable
        testID="one-native-clipboard-get-html"
        style={styles.chip}
        onPress={async () =>
          setHtml(await One.Clipboard.getString({ preferredFormat: 'html' }))
        }
      >
        <Text>Get html</Text>
      </Pressable>
      <Pressable
        testID="one-native-clipboard-subscribe"
        style={styles.chip}
        onPress={() => {
          if (sub.current) return
          sub.current = One.Clipboard.addListener((change) =>
            setEvent(`fired:${[...change.contentTypes].sort().join(',')}`)
          )
          setSubscribed('yes')
        }}
      >
        <Text>Subscribe changes</Text>
      </Pressable>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 16, gap: 12 },
  chip: { padding: 12, backgroundColor: '#eee', borderRadius: 8 },
})
