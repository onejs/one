import { Component, useState, type ReactNode } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { One } from 'one'

// MultiDatePicker plus the two PassKit buttons. selection and presses are the
// live values; observed only changes when the native side reports, so a reset
// that leaves observed at none proves the binding writes without fabricating
// an echo. the invalid controls stay unmounted until their pressable runs.
const now = new Date()
const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
const dayA = new Date(now.getFullYear(), now.getMonth(), 3, 12)
const dayB = new Date(now.getFullYear(), now.getMonth(), 17, 12)

const isoDay = (date: Date) => date.toISOString().slice(0, 10)

export default function OneNativePickerPassKit() {
  const [selection, setSelection] = useState<Date[]>([dayA, dayB])
  const [observed, setObserved] = useState('none')
  const [revision, setRevision] = useState(0)
  const [payPresses, setPayPresses] = useState(0)
  const [walletPresses, setWalletPresses] = useState(0)
  const [invalid, setInvalid] = useState(false)
  const [badLabel, setBadLabel] = useState(false)

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      testID="one-native-picker-passkit-screen"
    >
      <One.iOS.MultiDatePicker
        label="Trip days"
        selection={selection}
        onSelectionChange={(value) => {
          setSelection([...value])
          setObserved(value.map(isoDay).join(',') || 'empty')
        }}
        revision={revision}
        in={[monthStart, monthEnd]}
        testID="one-native-picker-passkit-picker"
      />
      <Text testID="one-native-picker-passkit-status" style={styles.line}>
        {`Selected: ${selection.length} · Observed: ${observed}`}
      </Text>
      <View style={styles.row}>
        <Pressable
          testID="one-native-picker-passkit-clear"
          style={styles.chip}
          onPress={() => {
            setSelection([])
            setRevision((value) => value + 1)
          }}
        >
          <Text>Clear</Text>
        </Pressable>
        <Pressable
          testID="one-native-picker-passkit-pick"
          style={styles.chip}
          onPress={() => {
            setSelection([dayA, dayB])
            setRevision((value) => value + 1)
          }}
        >
          <Text>Pick two</Text>
        </Pressable>
        <Pressable testID="one-native-picker-passkit-invalid" style={styles.chip} onPress={() => setInvalid(true)}>
          <Text>Invalid selection</Text>
        </Pressable>
      </View>
      {invalid ? (
        <Boundary testID="one-native-picker-passkit-error">
          {/* @ts-expect-error selection must be Dates */}
          <One.iOS.MultiDatePicker selection={['nope']} onSelectionChange={() => {}} />
        </Boundary>
      ) : null}
      <One.iOS.PayWithApplePayButton
        label="buy"
        onPress={() => setPayPresses((count) => count + 1)}
        testID="one-native-picker-passkit-pay"
      />
      <One.iOS.AddPassToWalletButton
        onPress={() => setWalletPresses((count) => count + 1)}
        testID="one-native-picker-passkit-wallet"
      />
      <One.iOS.PayWithApplePayButton
        label="donate"
        disabled
        testID="one-native-picker-passkit-pay-disabled"
      />
      <Text testID="one-native-picker-passkit-presses" style={styles.line}>
        {`Pay presses: ${payPresses} · Wallet presses: ${walletPresses}`}
      </Text>
      <Pressable
        testID="one-native-picker-passkit-bad-label"
        style={styles.chip}
        onPress={() => setBadLabel(true)}
      >
        <Text>Bad label</Text>
      </Pressable>
      {badLabel ? (
        <Boundary testID="one-native-picker-passkit-label-error">
          {/* @ts-expect-error label must be a system verb */}
          <One.iOS.PayWithApplePayButton label="shout" />
        </Boundary>
      ) : null}
    </ScrollView>
  )
}

class Boundary extends Component<{ children: ReactNode; testID: string }, { error: string }> {
  state = { error: '' }
  static getDerivedStateFromError(error: unknown) {
    return { error: error instanceof Error ? error.message : String(error) }
  }
  render() {
    if (!this.state.error) return this.props.children
    return (
      <View>
        <Text testID={this.props.testID} style={styles.line}>
          {`Error: ${this.state.error}`}
        </Text>
      </View>
    )
  }
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 16, paddingTop: 70, gap: 12 },
  row: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#eee',
    alignSelf: 'flex-start',
  },
  line: { fontSize: 14 },
})
