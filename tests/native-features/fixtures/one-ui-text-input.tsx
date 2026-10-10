import { useRef, useState, type ComponentProps } from 'react'
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import { One, useNativeState } from 'one'

// the ref handle type is not exported from `one`; read it off the component.
type TextInputRef = NonNullable<
  Extract<ComponentProps<typeof One.UI.TextInput>['ref'], { current: unknown }>['current']
>

// exercises the universal One.UI.TextInput: uncontrolled defaultValue, typing,
// maxLength, the imperative focus/blur/clear/isFocused handle, focus events,
// submit, a NativeState-controlled value, secure entry and a read-only field.
// results travel as labels like the other fixtures; the secret never does.
export default function OneUITextInput() {
  const field = useRef<TextInputRef>(null)
  const shared = useNativeState('')
  const [changed, setChanged] = useState('none')
  const [focuses, setFocuses] = useState(0)
  const [blurs, setBlurs] = useState(0)
  const [submits, setSubmits] = useState('0')
  const [isFocused, setIsFocused] = useState('unchecked')
  const [secretLength, setSecretLength] = useState(0)

  return (
    <View style={styles.screen} testID="one-ui-text-input-screen">
      <One.UI.TextInput
        ref={field}
        testID="one-ui-text-input-field"
        defaultValue="hello"
        placeholder="Type here"
        maxLength={8}
        returnKeyType={Platform.OS === 'android' ? 'done' : undefined}
        autoCorrect={false}
        autoCapitalize="none"
        onChangeText={setChanged}
        onFocus={() => setFocuses((count) => count + 1)}
        onBlur={() => setBlurs((count) => count + 1)}
        onSubmitEditing={(text) =>
          setSubmits((current) => `${Number(current.split(' ')[0]) + 1} ${text}`)
        }
        style={styles.input}
      />
      <Text>{`Changed: ${changed}`}</Text>
      <Text>{`Focus: ${focuses} Blur: ${blurs}`}</Text>
      <Text>{`Submits: ${submits}`}</Text>
      <Text>{`IsFocused: ${isFocused}`}</Text>
      <View style={styles.row}>
        <Chip
          id="one-ui-text-input-focus"
          label="Focus"
          onPress={() => field.current?.focus()}
        />
        <Chip
          id="one-ui-text-input-blur"
          label="Blur"
          onPress={() => field.current?.blur()}
        />
        <Chip
          id="one-ui-text-input-clear"
          label="Clear"
          onPress={() => field.current?.clear()}
        />
        <Chip
          id="one-ui-text-input-check"
          label="Check"
          onPress={() => setIsFocused(String(field.current?.isFocused()))}
        />
      </View>

      <One.UI.TextInput
        testID="one-ui-text-input-controlled"
        value={shared}
        placeholder="Shared"
        autoCorrect={false}
        autoCapitalize="none"
        style={styles.input}
      />
      <Text>{`Shared: ${shared.value === '' ? 'empty' : shared.value}`}</Text>
      <Chip
        id="one-ui-text-input-external"
        label="Set external"
        onPress={() => shared.set('external')}
      />

      <One.UI.TextInput
        testID="one-ui-text-input-secure"
        secureTextEntry
        autoCapitalize="none"
        placeholder="Password"
        onChangeText={(text) => setSecretLength(text.length)}
        style={styles.input}
      />
      <Text>{`Secret length: ${secretLength}`}</Text>

      <One.UI.TextInput
        testID="one-ui-text-input-readonly"
        defaultValue="locked"
        editable={false}
        style={styles.input}
      />
    </View>
  )
}

function Chip({
  id,
  label,
  onPress,
}: {
  id: string
  label: string
  onPress: () => void
}) {
  return (
    <Pressable
      testID={id}
      accessibilityRole="button"
      style={styles.chip}
      onPress={onPress}
    >
      <Text>{label}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16, gap: 8, backgroundColor: '#fff' },
  input: { height: 40 },
  row: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#eee',
  },
})
