import { useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { One } from 'one'

export default function Controls() {
  const [toggle, setToggle] = useState(false)
  const [stepper, setStepper] = useState(2)
  const [text, setText] = useState('One')
  const [secret, setSecret] = useState('safe')
  const [isOn, setIsOn] = useState(false)
  const [segment, setSegment] = useState(0)
  const [level, setLevel] = useState(0.25)
  const [choice, setChoice] = useState(0)
  const [presses, setPresses] = useState(0)
  const [events, setEvents] = useState(0)
  const [submits, setSubmits] = useState(0)
  const [accept, setAccept] = useState(true)
  const [revision, setRevision] = useState(0)
  const [offset, setOffset] = useState(0)
  const report = (change: () => void) => {
    setEvents((value) => value + 1)
    if (accept) change()
  }
  const reset = () => {
    setToggle(false)
    setStepper(2)
    setText('One')
    setSecret('safe')
    setIsOn(false)
    setSegment(0)
    setLevel(0.25)
    setChoice(0)
    setRevision((value) => value + 1)
  }
  return <View style={{ flex: 1, backgroundColor: '#fff' }}>
    <View style={{ padding: 20, gap: 10 }}>
      <Text style={{ fontSize: 26, color: '#162331' }}>AFTER: ten GTK controls in React Native</Text>
      <View style={{ flexDirection: 'row', gap: 24 }}>
        <Pressable onPress={() => setAccept((value) => !value)}><Text style={action}>{accept ? 'Accept changes' : 'Reject changes'}</Text></Pressable>
        <Pressable onPress={reset}><Text style={action}>Reset revision</Text></Pressable>
      </View>
      <Text style={status}>{`events ${events} | revision ${revision} | submits ${submits} | RN scroll ${Math.round(offset)}`}</Text>
      <Text style={status}>{`toggle ${toggle} | stepper ${stepper} | text ${JSON.stringify(text)} | secret ${secret.length} characters`}</Text>
    </View>
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, gap: 18, alignItems: 'flex-start' }}
      onScroll={({ nativeEvent }) => setOffset(nativeEvent.contentOffset.y)} scrollEventThrottle={16}>
      <Row title="Toggle: Mac label and boolean" note="disabled">
        <One.linux.Toggle label="Enable notifications" isOn={toggle} revision={revision}
          onIsOnChange={(event) => report(() => setToggle(event.isOn))} />
        <One.linux.Toggle label="Unavailable" isOn={false} disabled />
      </Row>
      <Row title="Stepper: native numeric value" note="0 to 5, step 0.25">
        <One.linux.Stepper value={stepper} minimumValue={0} maximumValue={5} step={0.25} revision={revision}
          onValueChange={(event) => report(() => setStepper(event.value))} />
        <One.linux.Stepper value={2} disabled />
      </Row>
      <Row title="TextField: controlled text" note="Enter submits">
        <One.linux.TextField label="Project" prompt="Project name" text={text} revision={revision}
          onTextChange={(value) => report(() => setText(value))} onSubmit={() => setSubmits((value) => value + 1)} />
        <One.linux.TextField text="Unavailable" disabled />
      </Row>
      <Row title="SecureField: GTK password entry" note="masked, Enter submits">
        <One.linux.SecureField label="Password" prompt="Password" text={secret} revision={revision}
          onTextChange={(value) => report(() => setSecret(value))} onSubmit={() => setSubmits((value) => value + 1)} />
        <One.linux.SecureField text="hidden" disabled />
      </Row>
      <Row title="Switch and Button" note={`button presses ${presses}`}>
        <One.linux.Switch isOn={isOn} revision={revision} onIsOnChange={(event) => report(() => setIsOn(event.isOn))} />
        <One.linux.Button title="Native button" onPress={() => setPresses((value) => value + 1)} />
      </Row>
      <Row title="SegmentedControl" note={`index ${segment}`}>
        <One.linux.SegmentedControl labels={['One', 'Two', 'Three']} selectedIndex={segment} revision={revision}
          onChange={(event) => report(() => setSegment(event.selectedIndex))} />
      </Row>
      <Row title="Slider and ProgressBar" note={`${Math.round(level * 100)} percent`}>
        <One.linux.Slider value={level} revision={revision} onValueChange={(event) => report(() => setLevel(event.value))} />
        <One.linux.ProgressBar value={level} />
      </Row>
      <Row title="DropDown" note={`index ${choice}`}>
        <One.linux.DropDown labels={['Alpha', 'Beta', 'Gamma']} selectedIndex={choice} revision={revision}
          onChange={(event) => report(() => setChoice(event.selectedIndex))} />
      </Row>
      <View style={{ padding: 20, width: 560, backgroundColor: '#e4f3e7', gap: 12 }}>
        <Text style={{ fontSize: 24, color: '#162331' }}>React Native content inside the same ScrollView</Text>
        <Text style={status}>GTK controls retain state while RN content scrolls and clips.</Text>
        <One.linux.Toggle label="Composed native control" isOn={toggle} revision={revision}
          onIsOnChange={(event) => report(() => setToggle(event.isOn))} />
      </View>
      {Array.from({ length: 4 }, (_, index) => <Text key={index} style={status}>{`React Native row ${index + 1}`}</Text>)}
    </ScrollView>
  </View>
}

function Row({ title, note, children }: { title: string; note: string; children: React.ReactNode }) {
  return <View style={{ gap: 6 }}>
    <Text style={status}>{`${title} | ${note}`}</Text>
    <View style={{ flexDirection: 'row', gap: 24, alignItems: 'center' }}>{children}</View>
  </View>
}
const status = { fontSize: 18, color: '#162331' }
const action = { fontSize: 18, color: '#084da4', backgroundColor: '#e0ecff', padding: 8 }
