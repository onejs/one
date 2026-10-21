import { useState } from 'react'
import { Pressable, Text, useColorScheme, useWindowDimensions, View } from 'react-native'
import { One } from 'one'
import { probe } from '../probe/resolution'

function Button(props: { id: string; label: string; cursor?: 'pointer' | 'auto' }) {
  const [count, setCount] = useState(0)
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  return (
    <Pressable
      testID={props.id}
      accessibilityLabel={`${props.label} button`}
      accessibilityRole="button"
      onPress={() => setCount((value) => value + 1)}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={({ pressed }) => ({
        cursor: props.cursor ?? 'pointer',
        padding: 10,
        marginBottom: 8,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: focused ? '#0a84ff' : 'transparent',
        backgroundColor: pressed ? '#1f5fbf' : hovered ? '#4d8de0' : '#2f6fd0',
      })}
    >
      <Text style={{ color: 'white' }} testID={`${props.id}-text`}>
        {`${props.label} presses ${count} hover ${hovered ? 'yes' : 'no'} focus ${focused ? 'yes' : 'no'}`}
      </Text>
    </Pressable>
  )
}

export default function Index() {
  const [isOn, setIsOn] = useState(false)
  const scheme = useColorScheme()
  const { width, height } = useWindowDimensions()
  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text testID="macos-label">macOS</Text>
      <Text testID="macos-probe">{probe}</Text>
      <Text testID="macos-env">{`scheme ${scheme} window ${Math.round(width)}x${Math.round(height)}`}</Text>
      <View style={{ marginTop: 12 }}>
        <Button id="first" label="First" />
        <Button id="second" label="Second" cursor="auto" />
      </View>
      <One.macOS.Toggle
        label="Enabled"
        isOn={isOn}
        revision={0}
        onIsOnChange={(event) => setIsOn(event.isOn)}
      />
      <Text testID="macos-toggle">{isOn ? 'on' : 'off'}</Text>
    </View>
  )
}
