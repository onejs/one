import { One } from 'one'
import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'

export default function Review2() {
  const [count, setCount] = useState(2)
  const [renders, setRenders] = useState(0)
  const [selection, setSelection] = useState(0)
  const [presses, setPresses] = useState(0)
  const [down, setDown] = useState(0)
  const [up, setUp] = useState(0)
  const [hover, setHover] = useState(false)
  const [small, setSmall] = useState(false)
  const [value, setValue] = useState(0.25)
  const [starts, setStarts] = useState(0)
  const [completes, setCompletes] = useState(0)
  const [disabled, setDisabled] = useState(false)
  const [revision, setRevision] = useState(0)
  const [cancel, setCancel] = useState('none')
  return (
    <View pointerEvents="box-none" style={{ flex: 1, backgroundColor: '#f5f5f5', padding: 20, gap: 14 }}>
      <Pressable onPress={() => setPresses((n) => n + 1)} onPointerDown={() => setDown((n) => n + 1)}
        onPointerUp={() => setUp((n) => n + 1)} onHoverIn={() => setHover(true)} onHoverOut={() => setHover(false)}
        style={{ width: 300, height: 100, padding: 12, backgroundColor: hover ? '#96ddba' : '#d5e5f5' }}>
        <Text style={{ fontSize: 20 }}>RN pointer target</Text>
        <Text>presses {presses}, down {down}, up {up}, hover {String(hover)}</Text>
      </Pressable>
      <Text style={{ fontSize: 24 }}>Linux review 2</Text>
      <Text>Stepper numeric value {String(count)}, parent renders {renders}</Text>
      <One.linux.Stepper testID={`stepper-${renders}`} label="Amount" value={count} in={[0, 3]} step={1} onValueChange={setCount}
        style={small ? { width: 20, height: 20 } : undefined} />
      <One.linux.Button title="Rerender parent" onPress={() => setTimeout(() => setRenders((n) => n + 1), 2000)} />
      <One.linux.DropDown labels={['Alpha', 'Beta', 'Gamma']} selectedIndex={selection}
        onChange={(event) => setSelection(event.selectedIndex)} />
      <Text>Selected {selection}; popup selection must leave RN counts unchanged</Text>
      <One.linux.TextField text="minimum" onTextChange={() => {}} style={small ? { width: 20, height: 20 } : undefined} />
      <One.linux.Button title="Allocate below minimum" onPress={() => setSmall(true)} />
      <One.linux.Slider value={value} onValueChange={(event) => setValue(event.value)} revision={revision} disabled={disabled}
        style={{ width: 400 }} onSlidingStart={() => {
          setStarts((n) => n + 1)
          if (cancel === 'disable') setTimeout(() => setDisabled(true), 500)
          if (cancel === 'revision') setTimeout(() => { setRevision((n) => n + 1); setValue(0.25) }, 500)
        }} onSlidingComplete={() => setCompletes((n) => n + 1)} />
      <Text>Slider {value.toFixed(2)}, starts {starts}, completes {completes}, revision {revision}, disabled {String(disabled)}</Text>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        {['none', 'disable', 'revision'].map((mode) => <One.linux.Button key={mode} title={`Cancel: ${mode}`} onPress={() => {
          setCancel(mode); setDisabled(false); setStarts(0); setCompletes(0)
        }} />)}
      </View>
      <Text>Cancellation mode: {cancel}</Text>
    </View>
  )
}
