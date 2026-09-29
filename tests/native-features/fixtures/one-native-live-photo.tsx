import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { One } from 'one'

export default function OneNativeLivePhoto() {
  const [assetId, setAssetId] = useState('')
  const [plainId, setPlainId] = useState('')
  const [activeId, setActiveId] = useState('')
  const [viewKey, setViewKey] = useState(0)
  const [status, setStatus] = useState('idle')
  const [metadata, setMetadata] = useState('pending')
  const [playback, setPlayback] = useState('waiting')
  const [error, setError] = useState('none')
  const [events, setEvents] = useState<string[]>([])
  const [invalid, setInvalid] = useState('pending')
  const [command, setCommand] = useState<'' | 'play' | 'stop'>('')
  const [revision, setRevision] = useState(0)

  const show = (identifier: string) => {
    setActiveId(identifier)
    setViewKey((value) => value + 1)
    setPlayback('waiting')
    setError('none')
    setEvents([])
    setCommand('')
    setRevision(0)
  }

  const authorize = async () => {
    setActiveId('')
    setStatus('requesting')
    try {
      const permission = await One.iOS.PhotoLibrary.requestReadPermission()
      if (permission !== 'authorized' && permission !== 'limited')
        throw new Error(`permission: ${permission}`)
      let live = ''
      let plain = ''
      const first = await One.iOS.PhotoLibrary.listAssets(0, 100)
      for (let offset = 0; offset < first.totalCount && (!live || !plain); offset += 100) {
        const page = offset === 0 ? first : await One.iOS.PhotoLibrary.listAssets(offset, 100)
        for (const item of page.assets) {
          if (item.isLivePhoto && item.width === 320 && item.height === 240)
            live = item.identifier
          if (!item.isLivePhoto && item.mediaType === 'image') plain ||= item.identifier
        }
      }
      if (!live || !plain) throw new Error(`assets missing: live=${live} plain=${plain}`)
      const liveAsset = await One.iOS.PhotoLibrary.getAsset(live)
      const plainAsset = await One.iOS.PhotoLibrary.getAsset(plain)
      setAssetId(live)
      setPlainId(plain)
      setMetadata(`live=${liveAsset.isLivePhoto}; plain=${plainAsset.isLivePhoto}; id=${liveAsset.identifier === live}`)
      setStatus('authorized')
    } catch (cause) {
      setStatus(`error: ${cause instanceof Error ? cause.message : String(cause)}`)
    }
  }

  const checkInvalid = () => {
    try {
      One.iOS.LivePhotoView({ assetIdentifier: ' ' })
      setInvalid('accepted')
    } catch (cause) {
      setInvalid(cause instanceof Error ? cause.message : String(cause))
    }
  }

  const send = (next: 'play' | 'stop') => {
    setCommand(next)
    setRevision((value) => value + 1)
  }

  const button = (title: string, testID: string, onPress: () => void) =>
    <Pressable accessibilityRole="button" testID={testID} style={styles.button} onPress={onPress}>
      <Text style={styles.buttonText}>{title}</Text>
    </Pressable>

  return <View style={styles.screen} testID="one-native-live-photo-screen">
    <Text style={styles.readout} numberOfLines={1} testID="one-native-live-photo-status">Status: {status}</Text>
    <Text style={styles.readout} numberOfLines={1} testID="one-native-live-photo-metadata">Metadata: {metadata}</Text>
    <Text style={styles.readout} numberOfLines={1} testID="one-native-live-photo-playback">Playback: {playback}</Text>
    <Text style={styles.readout} numberOfLines={1} testID="one-native-live-photo-error">Error: {error}</Text>
    <Text style={styles.readout} numberOfLines={1} testID="one-native-live-photo-events">Events: {events.join('>') || 'none'}</Text>
    <Text style={styles.readout} numberOfLines={1} testID="one-native-live-photo-invalid">Invalid: {invalid}</Text>
    <Text style={styles.readout} numberOfLines={1} testID="one-native-live-photo-command">Command: {command || 'none'}:{revision}</Text>
    <View style={styles.row}>
      {button('No permission', 'one-native-live-photo-permission', () => show('missing-asset-id'))}
      {button('Grant', 'one-native-live-photo-authorize', authorize)}
      {button('Invalid', 'one-native-live-photo-invalid-button', checkInvalid)}
    </View>
    <View style={styles.row}>
      {button('Missing', 'one-native-live-photo-missing', () => show('missing-asset-id'))}
      {button('Plain', 'one-native-live-photo-plain', () => show(plainId))}
      {button('Live', 'one-native-live-photo-live', () => show(assetId))}
    </View>
    <View style={styles.row}>
      {button('Play', 'one-native-live-photo-play', () => send('play'))}
      {button('Stop', 'one-native-live-photo-stop', () => send('stop'))}
    </View>
    <View collapsable={false} testID="one-native-live-photo-frame" style={styles.photo}>
      {activeId ? <One.iOS.LivePhotoView
        key={viewKey}
        assetIdentifier={activeId}
        command={command}
        commandRevision={revision}
        style={styles.photo}
        onPlaybackState={(state, code) => {
          setPlayback(state)
          setError(code || 'none')
          setEvents((current) => [...current, `${state}${code ? `:${code}` : ''}`])
        }}
      /> : null}
    </View>
    <View collapsable={false} testID="one-native-live-photo-static" style={styles.staticControl} />
  </View>
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 12, gap: 3, backgroundColor: '#fff' },
  readout: { height: 19, fontSize: 13 },
  row: { flexDirection: 'row', gap: 6, marginTop: 4 },
  button: { paddingHorizontal: 11, paddingVertical: 7, backgroundColor: '#293d62', borderRadius: 5 },
  buttonText: { color: '#fff', fontSize: 13 },
  photo: { width: 320, height: 240, backgroundColor: '#f2f2f2' },
  staticControl: { width: 80, height: 30, backgroundColor: '#df422e' },
})
