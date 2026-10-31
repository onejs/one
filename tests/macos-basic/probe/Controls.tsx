import { useState } from 'react'
import { Text, useColorScheme, View } from 'react-native'
import { One } from 'one'

export function NativeControls() {
  const [presses, setPresses] = useState(0)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [disabled, setDisabled] = useState(false)
  const [bordered, setBordered] = useState(true)
  const [mounted, setMounted] = useState(true)
  const [reject, setReject] = useState(false)
  const [changes, setChanges] = useState(0)
  const [revision, setRevision] = useState(0)
  const [prominentPresses, setProminentPresses] = useState(0)
  const [popUpIndex, setPopUpIndex] = useState(0)
  const [popUpChanges, setPopUpChanges] = useState(0)
  const [popUpRevision, setPopUpRevision] = useState(0)
  const scheme = useColorScheme()
  return (
    <View testID="native-controls" style={{ gap: 6, marginVertical: 8 }}>
      <Text>AppKit controls</Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <One.macOS.Button testID="native-disable" title={disabled ? 'Enable controls' : 'Disable controls'} onPress={() => setDisabled(!disabled)} />
        <One.macOS.Button testID="native-mount" title={mounted ? 'Unmount controls' : 'Mount controls'} onPress={() => setMounted(!mounted)} />
        <One.macOS.Button testID="native-set" title="Select Flags" onPress={() => { setSelectedIndex(2); setRevision(revision + 1) }} />
        <One.macOS.Button testID="native-reject" title={reject ? 'Accept selection' : 'Reject selection'} onPress={() => setReject(!reject)} />
        <One.macOS.Button testID="native-bordered" title={bordered ? 'Borderless action' : 'Bordered action'} onPress={() => setBordered(!bordered)} />
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <One.macOS.Button testID="native-prominent" title="Prominent action" prominent disabled={disabled} onPress={() => setProminentPresses(prominentPresses + 1)} />
        <One.macOS.PopUpButton
          testID="native-popup"
          accessibilityLabel="Sort order"
          labels={['Newest', 'Oldest', 'Name']}
          selectedIndex={popUpIndex}
          revision={popUpRevision}
          disabled={disabled}
          onChange={(event) => { setPopUpChanges(value => value + 1); setPopUpIndex(event.selectedIndex) }}
        />
        <One.macOS.Button testID="native-popup-set" title="Select Name" onPress={() => { setPopUpIndex(2); setPopUpRevision(popUpRevision + 1) }} />
      </View>
      {mounted && <View style={{ flexDirection: 'row', gap: 8 }}>
        <One.macOS.Button testID="native-action" title="New pane" systemImage="plus" bordered={bordered} disabled={disabled} onPress={() => setPresses(presses + 1)} />
        <One.macOS.SegmentedControl
          testID="native-filter"
          accessibilityLabel="Feed filter"
          labels={['All', 'Shares', 'Flags', 'Asks']}
          selectedIndex={selectedIndex}
          revision={revision}
          disabled={disabled}
          onChange={(event) => { setChanges(value => value + 1); if (!reject) setSelectedIndex(event.selectedIndex) }}
        />
      </View>}
      <Text testID="native-extra">{`prominent ${prominentPresses} popup ${popUpIndex} popup changes ${popUpChanges} scheme ${scheme}`}</Text>
      <Text testID="native-result">{`presses ${presses} selection ${selectedIndex} changes ${changes} disabled ${disabled} bordered ${bordered} mounted ${mounted} reject ${reject} revision ${revision}`}</Text>
    </View>
  )
}
