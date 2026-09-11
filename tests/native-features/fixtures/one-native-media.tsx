import { File, Paths } from 'expo-file-system'
import { useState } from 'react'
import { Swift } from 'one-native'
import { Pressable, StyleSheet, Text, View } from 'react-native'

const categories = ['Player', 'Preview'] as const

const previewText = [
  'One Native Quick Look fixture.',
  '',
  'QLPreviewController previews a file on disk, so this text was written to the cache',
  'directory before the control was handed its file:// url.',
].join('\n')

export default function OneNativeMedia() {
  const [category, setCategory] = useState<(typeof categories)[number]>('Player')
  const [autoplay, setAutoplay] = useState(false)
  const [tall, setTall] = useState(false)
  const [isPresented, setIsPresented] = useState(false)
  const [changes, setChanges] = useState(0)

  // AVPlayer and QLPreviewController both read a real file, so the fixture writes one of
  // each before rendering. writing on first render rather than in an effect means the urls
  // exist the first time the controls mount.
  const [media] = useState(() => {
    const video = new File(Paths.cache, 'one-native-media.mp4')
    video.write(videoBase64, { encoding: 'base64' })
    const preview = new File(Paths.cache, 'one-native-media.txt')
    preview.write(previewText)
    return { video, preview }
  })

  const handlePresentationChange = (value: boolean) => {
    setChanges((count) => count + 1)
    setIsPresented(value)
  }
  const status: [string, string | number][] = [
    ['Category', category],
    ['Video bytes', media.video.size ?? 0],
    ['Preview bytes', media.preview.size ?? 0],
    ['Autoplay', autoplay ? 'on' : 'off'],
    ['Height', tall ? 320 : 220],
    ['Presented', String(isPresented)],
    ['Changes', changes],
  ]

  return (
    <View style={styles.screen} testID="one-native-media-screen">
      <View style={styles.row}>
        {categories.map((item) => (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: category === item }}
            key={item}
            style={[styles.action, category === item && styles.selected]}
            testID={`one-native-media-category-${item.toLowerCase()}`}
            onPress={() => {
              setCategory(item)
              setIsPresented(false)
              setChanges(0)
            }}
          >
            <Text style={styles.actionText}>{item}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.status}>
        {status.map(([label, value]) => (
          <Text
            key={label}
            style={styles.statusText}
            testID={`one-native-media-${label.toLowerCase().replace(' ', '-')}`}
          >{`${label}: ${value}`}</Text>
        ))}
      </View>
      {category === 'Player' ? (
        <>
          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              style={styles.action}
              testID="one-native-media-autoplay"
              onPress={() => setAutoplay((value) => !value)}
            >
              <Text style={styles.actionText}>Toggle autoplay</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              style={styles.action}
              testID="one-native-media-height"
              onPress={() => setTall((value) => !value)}
            >
              <Text style={styles.actionText}>Toggle height</Text>
            </Pressable>
          </View>
          <Swift.VideoPlayer
            autoplay={autoplay}
            style={[styles.video, { height: tall ? 320 : 220 }]}
            testID="one-native-media-video"
            url={media.video.uri}
          />
        </>
      ) : (
        <>
          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              style={styles.action}
              testID="one-native-media-open"
              onPress={() => handlePresentationChange(true)}
            >
              <Text style={styles.actionText}>Open preview</Text>
            </Pressable>
          </View>
          <Swift.QuickLook
            isPresented={isPresented}
            testID="one-native-media-quicklook"
            url={media.preview.uri}
            onIsPresentedChange={handlePresentationChange}
          />
        </>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 10, paddingTop: 8, backgroundColor: '#F5F5F7' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  actions: { marginTop: 8, flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  action: {
    minHeight: 34,
    paddingHorizontal: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#E3E3E8',
  },
  selected: { backgroundColor: '#B7D5FF' },
  actionText: { color: '#17233A', fontSize: 12, fontWeight: '600' },
  status: { marginTop: 6, padding: 6, borderRadius: 8, backgroundColor: '#FFFFFF' },
  statusText: { color: '#17233A', fontSize: 11, fontVariant: ['tabular-nums'] },
  // VideoPlayer is a fill control: it has no ideal height to report, so it takes whatever
  // box Yoga gives it rather than sizing itself.
  video: { marginTop: 8 },
})

// a six second 160x120 solid colour h264 clip, encoded bit-exactly so the bytes never move.
// inlining it keeps the fixture self contained: AVPlayer needs a file on disk, and reading
// one over the network would make every run depend on the simulator's connection.
const videoBase64 =
  'AAAAIGZ0eXBpc29tAAACAGlzb21pc28yYXZjMW1wNDEAAAStbW9vdgAAAGxtdmhkAAAAAAAAAAAAAAAAAAAD6AAAF3AA' +
  'AQAAAQAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
  'AAAAAAAAAAAAAgAAA/x0cmFrAAAAXHRraGQAAAADAAAAAAAAAAAAAAABAAAAAAAAF3AAAAAAAAAAAAAAAAAAAAAAAAEA' +
  'AAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAABAAAAAAKAAAAB4AAAAAAAkZWR0cwAAABxlbHN0AAAAAAAAAAEAABdw' +
  'AAAQAAABAAAAAAN0bWRpYQAAACBtZGhkAAAAAAAAAAAAAAAAAAAwAAABIABVxAAAAAAALWhkbHIAAAAAAAAAAHZpZGUA' +
  'AAAAAAAAAAAAAABWaWRlb0hhbmRsZXIAAAADH21pbmYAAAAUdm1oZAAAAAEAAAAAAAAAAAAAACRkaW5mAAAAHGRyZWYA' +
  'AAAAAAAAAQAAAAx1cmwgAAAAAQAAAt9zdGJsAAAAw3N0c2QAAAAAAAAAAQAAALNhdmMxAAAAAAAAAAEAAAAAAAAAAAAA' +
  'AAAAAAAAAKAAeABIAAAASAAAAAAAAAABDExhdmMgbGlieDI2NAAAAAAAAAAAAAAAAAAAAAAAAAAAGP//AAAAOWF2Y0MB' +
  'ZAAM/+EAG2dkAAysdhEKEflwEQAAAwABAAADAAwPFCmEYAEAB2joQ4RLIsD9+PgAAAAAEHBhc3AAAAABAAAAAQAAABRi' +
  'dHJ0AAAAAAAAB1UAAAAAAAAAGHN0dHMAAAAAAAAAAQAAACQAAAgAAAAAKHN0c3MAAAAAAAAABgAAAAEAAAAHAAAADQAA' +
  'ABMAAAAZAAAAHwAAAQBjdHRzAAAAAAAAAB4AAAABAAAQAAAAAAEAADAAAAAAAQAAEAAAAAABAAAAAAAAAAIAAAgAAAAA' +
  'AQAAEAAAAAABAAAwAAAAAAEAABAAAAAAAQAAAAAAAAACAAAIAAAAAAEAABAAAAAAAQAAMAAAAAABAAAQAAAAAAEAAAAA' +
  'AAAAAgAACAAAAAABAAAQAAAAAAEAADAAAAAAAQAAEAAAAAABAAAAAAAAAAIAAAgAAAAAAQAAEAAAAAABAAAwAAAAAAEA' +
  'ABAAAAAAAQAAAAAAAAACAAAIAAAAAAEAABAAAAAAAQAAMAAAAAABAAAQAAAAAAEAAAAAAAAAAgAACAAAAAAcc3RzYwAA' +
  'AAAAAAABAAAAAQAAACQAAAABAAAApHN0c3oAAAAAAAAAAAAAACQAAALoAAAADwAAAAwAAAAMAAAADAAAAAwAAAA5AAAA' +
  'DwAAAAwAAAAMAAAADAAAAAwAAAA5AAAADwAAAAwAAAAMAAAADAAAAAwAAAA5AAAADwAAAAwAAAAMAAAADAAAAAwAAAA5' +
  'AAAADwAAAAwAAAAMAAAADAAAAAwAAAA5AAAADwAAAA0AAAAMAAAADAAAAAwAAAAUc3RjbwAAAAAAAAABAAAE3QAAAD11' +
  'ZHRhAAAANW1ldGEAAAAAAAAAIWhkbHIAAAAAAAAAAG1kaXJhcHBsAAAAAAAAAAAAAAAACGlsc3QAAAAIZnJlZQAABYht' +
  'ZGF0AAACrAYF//+o3EXpvebZSLeWLNgg2SPu73gyNjQgLSBjb3JlIDE2NSByMzIyMiBiMzU2MDVhIC0gSC4yNjQvTVBF' +
  'Ry00IEFWQyBjb2RlYyAtIENvcHlsZWZ0IDIwMDMtMjAyNSAtIGh0dHA6Ly93d3cudmlkZW9sYW4ub3JnL3gyNjQuaHRt' +
  'bCAtIG9wdGlvbnM6IGNhYmFjPTEgcmVmPTE2IGRlYmxvY2s9MTowOjAgYW5hbHlzZT0weDM6MHgxMzMgbWU9dW1oIHN1' +
  'Ym1lPTEwIHBzeT0xIHBzeV9yZD0xLjAwOjAuMDAgbWl4ZWRfcmVmPTEgbWVfcmFuZ2U9MjQgY2hyb21hX21lPTEgdHJl' +
  'bGxpcz0yIDh4OGRjdD0xIGNxbT0wIGRlYWR6b25lPTIxLDExIGZhc3RfcHNraXA9MSBjaHJvbWFfcXBfb2Zmc2V0PS0y' +
  'IHRocmVhZHM9NCBsb29rYWhlYWRfdGhyZWFkcz0xIHNsaWNlZF90aHJlYWRzPTAgbnI9MCBkZWNpbWF0ZT0xIGludGVy' +
  'bGFjZWQ9MCBibHVyYXlfY29tcGF0PTAgY29uc3RyYWluZWRfaW50cmE9MCBiZnJhbWVzPTUgYl9weXJhbWlkPTIgYl9h' +
  'ZGFwdD0yIGJfYmlhcz0wIGRpcmVjdD0zIHdlaWdodGI9MSBvcGVuX2dvcD0wIHdlaWdodHA9MiBrZXlpbnQ9NiBrZXlp' +
  'bnRfbWluPTEgc2NlbmVjdXQ9NDAgaW50cmFfcmVmcmVzaD0wIHJjX2xvb2thaGVhZD02IHJjPWNyZiBtYnRyZWU9MSBj' +
  'cmY9MzAuMCBxY29tcD0wLjYwIHFwbWluPTAgcXBtYXg9NjkgcXBzdGVwPTQgaXBfcmF0aW89MS40MCBhcT0xOjEuMDAA' +
  'gAAAADRliIEABL/+21vzLHY0Ks4Yv7QPS/XDqy93CpQNGUM8t0tds9M6jm9LFRnAD6AAjIOZ2KrhAAAAC0GaCVsQ//3h' +
  'ADigAAAACEGeEI4h/wE3AAAACAGeGE0Q/wE3AAAACAGeGNqQ/wE3AAAACAGeGRqQ/wE3AAAANWWIgIABT/7hA/gUxRPm' +
  'NzH6ScKFXLkbcSl0zZ85AYj7Rvj5rFPo5dcyrZrgCnAAQUFul18RAAAAC0GaCVsQ//3hADihAAAACEGeEI4h/wE3AAAA' +
  'CAGeGE0Q/wE3AAAACAGeGNqQ/wE3AAAACAGeGRqQ/wE3AAAANWWIgQAFf/7jq/gUynXHQ2JKSSw7RjT88Ul2zyEzccsF' +
  'UPz6rlbvBltktL8gDIAAXkH+10igAAAAC0GaCVsQ//3hADihAAAACEGeEI4h/wE3AAAACAGeGE0Q/wE3AAAACAGeGNqQ' +
  '/wE3AAAACAGeGRqQ/wE3AAAANWWIgIABX/7jq/gUynXHQ2JKSSw7RjT88Ul2zyEzccsFUPz6rlbvBltktL8gDIAAXkH+' +
  '10ihAAAAC0GaCVsQ//3hADigAAAACEGeEI4h/wE3AAAACAGeGE0Q/wE3AAAACAGeGNqQ/wE3AAAACAGeGRqQ/wE3AAAA' +
  'NWWIgQAFf/7jq/gUynXHQ2JKSSw7RjT88Ul2zyEzccsFUPz6rlbvBltktL8gDIAAXkH+10ihAAAAC0GaCVsQ//3hADig' +
  'AAAACEGeEI4h/wE3AAAACAGeGE0Q/wE3AAAACAGeGNqQ/wE3AAAACAGeGRqQ/wE3AAAANWWIgIABX/7jq/gUynXHQ2JK' +
  'SSw7RjT88Ul2zyEzccsFUPz6rlbvBltktL8gDIAAXkH+10igAAAAC0GaCVsQ//3hADigAAAACUGeEI4gh/8A/wAAAAgB' +
  'nhhNEP8BNwAAAAgBnhjakP8BNwAAAAgBnhkakP8BNw=='
