import { useState } from 'react'
import { Text, View } from 'react-native'
import { One } from 'one'

export default function Controlled() {
  const [isOn, setIsOn] = useState(false)
  const [segment, setSegment] = useState(0)
  const [accept, setAccept] = useState(true)
  const [revision, setRevision] = useState(0)
  const [events, setEvents] = useState(0)
  return <View style={{ flex: 1, padding: 32, gap: 24, backgroundColor: '#fff' }}>
    <Text style={{ fontSize: 26, color: '#162331' }}>AFTER: shared controlled values</Text>
    <View style={{ width: 80 }}><One.linux.Switch isOn={isOn} revision={revision}
      onIsOnChange={(event) => { setEvents((value) => value + 1); if (accept) setIsOn(event.isOn) }} /></View>
    <One.linux.SegmentedControl labels={['One', 'Two', 'Three']} selectedIndex={segment} revision={revision}
      onChange={(event) => { setEvents((value) => value + 1); if (accept) setSegment(event.selectedIndex) }} />
    <One.linux.Button title={accept ? 'Accepting' : 'Rejecting'} onPress={() => setAccept((value) => !value)} />
    <One.linux.Button title="Reset revision" onPress={() => { setIsOn(false); setSegment(0); setRevision((value) => value + 1) }} />
    <Text style={{ fontSize: 20, color: '#162331' }}>{`switch ${isOn}, segment ${segment}\nevents ${events}, revision ${revision}`}</Text>
  </View>
}
