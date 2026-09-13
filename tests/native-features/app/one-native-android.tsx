import { useState } from 'react'
import { Compose } from 'one-native'

const rootStyle = { flex: 1, padding: 16 } as const
const rowStyle = {
  flexDirection: 'row',
  alignItems: 'center',
  marginBottom: 8,
} as const
const boxStyle = { height: 44, marginBottom: 8 } as const

export default function OneNativeAndroid() {
  const [propExpanded, setPropExpanded] = useState(false)
  const [buttonTaps, setButtonTaps] = useState(0)
  const [switchValue, setSwitchValue] = useState(false)
  const [switchRequest, setSwitchRequest] = useState(false)
  const [rejectSwitch, setRejectSwitch] = useState(true)
  const [switchRevision, setSwitchRevision] = useState(0)
  const [reordered, setReordered] = useState(false)
  const [showOptional, setShowOptional] = useState(true)
  const [disabledButtonTaps, setDisabledButtonTaps] = useState(0)
  const [disabledSwitchTaps, setDisabledSwitchTaps] = useState(0)

  const propText = propExpanded ? 'Expanded Android Compose text prop' : 'Compact prop'
  const order = reordered ? ['beta', 'alpha'] : ['alpha', 'beta']

  return (
    <Compose.Column
      accessibilityLabel="One Native Android proof"
      testID="one-native-android-screen"
      style={rootStyle}
    >
      <Compose.Text
        accessibilityRole="header"
        accessibilityLabel="Android proof mounted"
        testID="one-native-android-mounted"
        text="Android proof mounted"
      />

      <Compose.Text
        testID="one-native-android-prop-status"
        text={`Prop: ${propExpanded ? 'expanded' : 'compact'}`}
      />
      <Compose.Box
        accessibilityLabel="Fresh bounds box"
        testID="one-native-android-bounds-box"
        style={{ ...boxStyle, width: propExpanded ? 248 : 96 }}
      >
        <Compose.Text testID="one-native-android-prop-value" text={propText} />
      </Compose.Box>
      <Compose.Button
        accessibilityRole="button"
        accessibilityState={{ disabled: false }}
        label="Mutate text prop"
        onPress={() => setPropExpanded((value) => !value)}
        testID="one-native-android-prop-mutate"
        enabled
      />

      <Compose.Text
        testID="one-native-android-button-status"
        text={`Button taps: ${buttonTaps}`}
      />
      <Compose.Row style={rowStyle}>
        <Compose.Button
          accessibilityRole="button"
          accessibilityState={{ disabled: false }}
          label="Tap real button"
          onPress={() => setButtonTaps((count) => count + 1)}
          testID="one-native-android-real-button"
          enabled
        />
        <Compose.Button
          accessibilityRole="button"
          accessibilityState={{ disabled: false }}
          label={reordered ? 'Restore keyed order' : 'Reorder keyed rows'}
          onPress={() => setReordered((value) => !value)}
          testID="one-native-android-reorder"
          enabled
        />
      </Compose.Row>

      <Compose.Text
        testID="one-native-android-switch-status"
        text={`Switch: ${switchValue ? 'on' : 'off'} · Request: ${switchRequest ? 'on' : 'off'} · Revision: ${switchRevision}`}
      />
      <Compose.Row style={rowStyle}>
        <Compose.Switch
          accessibilityLabel="Controlled switch"
          accessibilityRole="switch"
          accessibilityState={{ checked: switchValue, disabled: false }}
          checked={switchValue}
          enabled
          label="Controlled switch"
          onCheckedChange={(value) => {
            setSwitchRequest(value)
            if (!rejectSwitch) setSwitchValue(value)
          }}
          revision={switchRevision}
          testID="one-native-android-switch"
        />
        <Compose.Button
          accessibilityRole="button"
          accessibilityState={{ disabled: false }}
          label={rejectSwitch ? 'Accept switch' : 'Reject switch'}
          onPress={() => setRejectSwitch((value) => !value)}
          testID="one-native-android-switch-policy"
          enabled
        />
        <Compose.Button
          accessibilityRole="button"
          accessibilityState={{ disabled: false }}
          label="Reset switch revision"
          onPress={() => {
            setSwitchValue(false)
            setSwitchRequest(false)
            setSwitchRevision((value) => value + 1)
          }}
          testID="one-native-android-switch-reset"
          enabled
        />
      </Compose.Row>

      <Compose.Text
        testID="one-native-android-lifecycle-status"
        text={`Optional: ${showOptional ? 'mounted' : 'unmounted'}`}
      />
      <Compose.Button
        accessibilityRole="button"
        accessibilityState={{ disabled: false }}
        label={showOptional ? 'Unmount optional' : 'Remount optional'}
        onPress={() => setShowOptional((value) => !value)}
        testID="one-native-android-toggle-optional"
        enabled
      />
      {showOptional ? (
        <Compose.Box key="optional" testID="one-native-android-optional" style={boxStyle}>
          <Compose.Text
            accessibilityLabel="Optional child mounted"
            testID="one-native-android-optional-text"
            text="Optional child mounted"
          />
        </Compose.Box>
      ) : null}

      <Compose.Text
        testID="one-native-android-disabled-status"
        text={`Disabled button taps: ${disabledButtonTaps} · Disabled switch taps: ${disabledSwitchTaps}`}
      />
      <Compose.Row style={rowStyle}>
        <Compose.Button
          accessibilityRole="button"
          accessibilityState={{ disabled: true }}
          enabled={false}
          label="Disabled button"
          onPress={() => setDisabledButtonTaps((count) => count + 1)}
          testID="one-native-android-disabled-button"
        />
        <Compose.Switch
          accessibilityLabel="Disabled switch"
          accessibilityRole="switch"
          accessibilityState={{ checked: false, disabled: true }}
          checked={false}
          enabled={false}
          label="Disabled switch"
          onCheckedChange={() => setDisabledSwitchTaps((count) => count + 1)}
          testID="one-native-android-disabled-switch"
        />
      </Compose.Row>

      <Compose.Text testID="one-native-android-order-status" text="Keyed order" />
      <Compose.Row
        accessibilityLabel="Keyed rows"
        testID="one-native-android-order-row"
        style={rowStyle}
      >
        {order.map((item) => (
          <Compose.Text
            key={item}
            testID={`one-native-android-order-${item}`}
            text={`Item ${item}`}
          />
        ))}
      </Compose.Row>

      <Compose.Box
        accessibilityLabel="Tap real button"
        testID="one-native-android-decoy"
        style={{ ...boxStyle, width: 180 }}
      >
        <Compose.Text
          accessibilityRole="text"
          testID="one-native-android-decoy-label"
          text="Tap real button"
        />
      </Compose.Box>
    </Compose.Column>
  )
}
