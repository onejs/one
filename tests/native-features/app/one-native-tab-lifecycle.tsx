import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { One } from 'one'

// tab changes on a live TabView: a tab joining after mount, disabled changing after mount, and
// an action tab's first press on a fresh mount. the home page holds child view controllers (a
// pager and a composed button) so re-hosting it under another controller would surface.
export default function OneNativeTabLifecycle() {
  const [selection, setSelection] = useState('home')
  const [page, setPage] = useState('first')
  const [joined, setJoined] = useState(false)
  const [disabled, setDisabled] = useState(false)
  const [presses, setPresses] = useState(0)
  const [joinedPresses, setJoinedPresses] = useState(0)
  const [gateOpen, setGateOpen] = useState(false)
  const [gatePresses, setGatePresses] = useState(0)
  const [mount, setMount] = useState(0)

  return (
    <View style={styles.screen}>
      <Text testID="tab-lifecycle-status">
        {`selection:${selection} presses:${presses} joined:${joined} joinedPresses:${joinedPresses} disabled:${disabled} gateOpen:${gateOpen} gatePresses:${gatePresses} mount:${mount}`}
      </Text>
      <One.iOS.Tabs key={mount} selection={selection} onSelectionChange={setSelection} style={{ flex: 1 }}>
        <One.iOS.Tab id="home" title="Home" systemImage="house">
          <View style={styles.page}>
            <Pressable testID="tab-lifecycle-join" style={styles.button} onPress={() => setJoined((value) => !value)}>
              <Text style={styles.buttonText}>{joined ? 'Remove tab' : 'Join tab'}</Text>
            </Pressable>
            <Pressable testID="tab-lifecycle-disable" style={styles.button} onPress={() => setDisabled((value) => !value)}>
              <Text style={styles.buttonText}>{disabled ? 'Enable other' : 'Disable other'}</Text>
            </Pressable>
            <Pressable testID="tab-lifecycle-gate" style={styles.button} onPress={() => setGateOpen((value) => !value)}>
              <Text style={styles.buttonText}>{gateOpen ? 'Close gate' : 'Open gate'}</Text>
            </Pressable>
            <Pressable
              testID="tab-lifecycle-remount"
              style={styles.button}
              onPress={() => {
                setGateOpen(false)
                setMount((value) => value + 1)
              }}
            >
              <Text style={styles.buttonText}>Remount tabs</Text>
            </Pressable>
            <One.iOS.Button label="Composed" onPress={() => {}} />
            <One.iOS.Pager selection={page} onSelectionChange={setPage} style={{ height: 120 }}>
              <One.iOS.Page id="first">
                <Text testID="tab-lifecycle-pager-first">Pager first</Text>
              </One.iOS.Page>
              <One.iOS.Page id="second">
                <Text>Pager second</Text>
              </One.iOS.Page>
            </One.iOS.Pager>
          </View>
        </One.iOS.Tab>
        <One.iOS.Tab id="other" title="Other" systemImage="star" disabled={disabled}>
          <View style={styles.page}>
            <Text testID="tab-lifecycle-other">Other page</Text>
          </View>
        </One.iOS.Tab>
        <One.iOS.Tab id="act" title="Act" systemImage="bolt" onPress={() => setPresses((value) => value + 1)} />
        <One.iOS.Tab
          id="gate"
          title="Gate"
          systemImage="lock"
          disabled={!gateOpen}
          onPress={() => setGatePresses((value) => value + 1)}
        />
        {joined ? (
          <One.iOS.Tab
            id="joined"
            title="Joined"
            systemImage="plus"
            role="prominent"
            onPress={() => setJoinedPresses((value) => value + 1)}
          />
        ) : null}
      </One.iOS.Tabs>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingTop: 8, backgroundColor: '#F5F5F7' },
  page: { flex: 1, padding: 16, gap: 12 },
  button: { backgroundColor: '#007aff', borderRadius: 10, padding: 10, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '600' },
})
