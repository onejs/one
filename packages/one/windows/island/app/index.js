// The window island prototype's React app. React state drives every view;
// the WinUI switch is a OneWindowsToggle, controlled the way the Mac and Linux
// controls are: an input toggle arrives as onIsOnChange, React accepts it into
// state, and acknowledgedEvent tells the native switch React has caught up.
// Each accepted change mounts a new square, the bar takes the switch's color,
// a blue frame shows the switch's focus, and `unmount` and `mount` commands
// from the host remove the switch and mount a fresh one.
import React, { useEffect, useState } from 'react'
import { AppRegistry, DeviceEventEmitter, View } from 'react-native'
import { get as getNativeComponent } from 'react-native/Libraries/NativeComponent/NativeComponentRegistry'

const OneWindowsToggle = getNativeComponent('OneWindowsToggle', () => ({
  uiViewClassName: 'OneWindowsToggle',
  bubblingEventTypes: {},
  directEventTypes: {
    topIsOnChange: { registrationName: 'onIsOnChange' },
    topFocusChange: { registrationName: 'onFocusChange' },
  },
  validAttributes: { isOn: true, revision: true, acknowledgedEvent: true, label: true },
}))

const green = '#0F7B0F'
const red = '#C42B1C'

function App() {
  const [isOn, setIsOn] = useState(false)
  const [changes, setChanges] = useState([])
  const [focused, setFocused] = useState(false)
  // each mount is a new switch with its own event count, scoped by revision
  const [generation, setGeneration] = useState(1)
  const [mounted, setMounted] = useState(true)
  const [acknowledged, setAcknowledged] = useState(0)

  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener('oneIslandCommand', (command) => {
      console.log(`react command ${command}`)
      if (command === 'unmount') {
        setMounted(false)
        setFocused(false)
      } else if (command === 'mount') {
        setGeneration((value) => value + 1)
        setAcknowledged(0)
        setMounted(true)
      }
    })
    return () => subscription.remove()
  }, [])

  const label = `React: ${isOn ? 'on' : 'off'}, ${changes.length} changes, switch ${generation}`

  return (
    <View style={{ flex: 1, backgroundColor: '#F3F3F3', padding: 24 }}>
      <View style={{ height: 40, backgroundColor: isOn ? green : '#8A8A8A' }} />
      <View style={{ flexDirection: 'row', height: 24, marginTop: 16 }}>
        {changes.map((on, index) => (
          <View key={index} style={{ width: 24, height: 24, marginRight: 8, backgroundColor: on ? green : red }} />
        ))}
      </View>
      <View
        style={{
          marginTop: 24,
          alignSelf: 'center',
          padding: 6,
          backgroundColor: focused ? '#005FB8' : '#DADADA',
        }}
      >
        {mounted ? (
          <OneWindowsToggle
            key={generation}
            style={{ width: 360, height: 64 }}
            isOn={isOn}
            revision={generation}
            acknowledgedEvent={acknowledged}
            label={label}
            onIsOnChange={(event) => {
              const { isOn: next, eventCount, revision } = event.nativeEvent
              console.log(`react onIsOnChange isOn=${next} eventCount=${eventCount} revision=${revision}`)
              if (revision !== generation || eventCount <= acknowledged) return
              setIsOn(next)
              setChanges((list) => [...list, next])
              setAcknowledged(eventCount)
            }}
            onFocusChange={(event) => {
              console.log(`react onFocusChange focused=${event.nativeEvent.focused}`)
              setFocused(event.nativeEvent.focused)
            }}
          />
        ) : (
          <View style={{ width: 360, height: 64, backgroundColor: '#B0B0B0' }} />
        )}
      </View>
      <View style={{ flex: 1 }} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <View style={{ width: 48, height: 48, backgroundColor: '#005FB8' }} />
        <View style={{ width: 48, height: 48, backgroundColor: '#5C2D91' }} />
      </View>
    </View>
  )
}

AppRegistry.registerComponent('OneWindowsIsland', () => App)
