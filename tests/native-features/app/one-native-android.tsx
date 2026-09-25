import { useState } from 'react'
import { One } from 'one'

const rootStyle = { flex: 1 } as const
const rowStyle = { fillMaxWidth: true } as const
const boxStyle = { height: 36 } as const

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
  const [iconTaps, setIconTaps] = useState(0)

  const propText = propExpanded ? 'Expanded Android Compose text prop' : 'Compact prop'
  const order = reordered ? ['beta', 'alpha'] : ['alpha', 'beta']

  return (
    <One.Android.Column
      accessibilityLabel="One Native Android proof"
      testID="one-native-android-screen"
      style={rootStyle}
      spacing={4}
      composeStyle={{ padding: 8, fillMaxWidth: true, fillMaxHeight: true }}
    >
      <One.Android.Text
        accessibilityRole="header"
        accessibilityLabel="Android proof mounted"
        testID="one-native-android-mounted"
        text="Android proof mounted"
      />

      <One.Android.Text
        testID="one-native-android-prop-status"
        text={`Prop: ${propExpanded ? 'expanded' : 'compact'}`}
      />
      <One.Android.Box
        accessibilityLabel="Fresh bounds box"
        testID="one-native-android-bounds-box"
        composeStyle={{
          ...boxStyle,
          width: propExpanded ? 248 : 96,
          backgroundColor: '#E8DEF8',
          borderColor: '#6750A4',
          borderWidth: 1,
          cornerRadius: 8,
          padding: 6,
        }}
      >
        <One.Android.Text testID="one-native-android-prop-value" text={propText} />
      </One.Android.Box>
      <One.Android.Button
        accessibilityRole="button"
        accessibilityState={{ disabled: false }}
        label="Mutate text prop"
        onPress={() => setPropExpanded((value) => !value)}
        testID="one-native-android-prop-mutate"
        disabled={false}
      />

      <One.Android.Text
        testID="one-native-android-button-status"
        text={`Button taps: ${buttonTaps}`}
      />
      <One.Android.Row
        testID="one-native-android-button-row"
        composeStyle={rowStyle}
        spacing={8}
      >
        <One.Android.Button
          accessibilityRole="button"
          accessibilityState={{ disabled: false }}
          label="Tap button"
          variant="outlined"
          onPress={() => setButtonTaps((count) => count + 1)}
          testID="one-native-android-real-button"
          disabled={false}
        />
        <One.Android.Button
          accessibilityRole="button"
          accessibilityState={{ disabled: false }}
          label={reordered ? 'Restore order' : 'Reorder'}
          onPress={() => setReordered((value) => !value)}
          testID="one-native-android-reorder"
          disabled={false}
        />
      </One.Android.Row>

      <One.Android.Row
        accessibilityLabel="Material Symbols row"
        testID="one-native-android-icon-row"
        composeStyle={rowStyle}
        spacing={8}
      >
        <One.Android.Icon
          accessibilityLabel="Star outline"
          testID="one-native-android-icon"
          name="star"
          size={24}
        />
        <One.Android.Icon
          accessibilityLabel="Star filled"
          testID="one-native-android-icon-filled"
          name="star"
          filled
          size={24}
        />
        <One.Android.Button
          accessibilityRole="button"
          accessibilityLabel={iconTaps > 0 ? 'Icon tapped' : 'Add icon'}
          accessibilityState={{ disabled: false }}
          label={iconTaps > 0 ? 'Icon tapped' : 'Add icon'}
          icon="add"
          onPress={() => setIconTaps((count) => count + 1)}
          testID="one-native-android-icon-button"
          disabled={false}
        />
      </One.Android.Row>

      <One.Android.Text
        testID="one-native-android-switch-status"
        text={`Switch: ${switchValue ? 'on' : 'off'} · Request: ${switchRequest ? 'on' : 'off'} · Revision: ${switchRevision}`}
      />
      <One.Android.Text
        testID="one-native-android-switch-policy-status"
        text={`Policy: ${rejectSwitch ? 'reject' : 'accept'}`}
      />
      <One.Android.Row
        testID="one-native-android-switch-row"
        composeStyle={rowStyle}
        spacing={8}
      >
        <One.Android.Switch
          accessibilityLabel="Controlled switch"
          accessibilityRole="switch"
          accessibilityState={{ checked: switchValue, disabled: false }}
          isOn={switchValue}
          disabled={false}
          onIsOnChange={(value) => {
            setSwitchRequest(value)
            if (!rejectSwitch) setSwitchValue(value)
          }}
          revision={switchRevision}
          testID="one-native-android-switch"
        />
        <One.Android.Button
          accessibilityRole="button"
          accessibilityLabel={rejectSwitch ? 'Accept' : 'Reject'}
          accessibilityState={{ disabled: false }}
          label={rejectSwitch ? 'Accept' : 'Reject'}
          onPress={() => setRejectSwitch((value) => !value)}
          testID="one-native-android-switch-policy"
          disabled={false}
        />
        <One.Android.Button
          accessibilityRole="button"
          accessibilityState={{ disabled: false }}
          label="Reset"
          tone="danger"
          onPress={() => {
            setSwitchValue(false)
            setSwitchRequest(false)
            setSwitchRevision((value) => value + 1)
          }}
          testID="one-native-android-switch-reset"
          disabled={false}
        />
      </One.Android.Row>

      <One.Android.Text
        testID="one-native-android-lifecycle-status"
        text={`Optional: ${showOptional ? 'mounted' : 'unmounted'}`}
      />
      <One.Android.Button
        accessibilityRole="button"
        accessibilityState={{ disabled: false }}
        label={showOptional ? 'Unmount optional' : 'Remount optional'}
        onPress={() => setShowOptional((value) => !value)}
        testID="one-native-android-toggle-optional"
        disabled={false}
      />
      {showOptional ? (
        <One.Android.Box
          key="optional"
          testID="one-native-android-optional"
          composeStyle={boxStyle}
        >
          <One.Android.Text
            accessibilityLabel="Optional child mounted"
            testID="one-native-android-optional-text"
            text="Optional child mounted"
          />
        </One.Android.Box>
      ) : null}

      <One.Android.Text
        testID="one-native-android-disabled-status"
        text={`Disabled button taps: ${disabledButtonTaps} · Disabled switch taps: ${disabledSwitchTaps}`}
      />
      <One.Android.Row
        testID="one-native-android-disabled-row"
        composeStyle={rowStyle}
        spacing={8}
      >
        <One.Android.Button
          accessibilityRole="button"
          accessibilityState={{ disabled: true }}
          disabled
          label="Disabled button"
          onPress={() => setDisabledButtonTaps((count) => count + 1)}
          testID="one-native-android-disabled-button"
        />
        <One.Android.Switch
          accessibilityLabel="Disabled switch"
          accessibilityRole="switch"
          accessibilityState={{ checked: false, disabled: true }}
          isOn={false}
          disabled
          label="Disabled switch"
          onIsOnChange={() => setDisabledSwitchTaps((count) => count + 1)}
          testID="one-native-android-disabled-switch"
        />
      </One.Android.Row>

      <One.Android.Text testID="one-native-android-order-status" text="Keyed order" />
      <One.Android.Row
        accessibilityLabel="Keyed rows"
        testID="one-native-android-order-row"
        composeStyle={rowStyle}
        spacing={8}
      >
        {order.map((item) => (
          <One.Android.Text
            key={item}
            testID={`one-native-android-order-${item}`}
            text={`Item ${item}`}
          />
        ))}
      </One.Android.Row>

      <One.Android.Box
        accessibilityLabel="Tap real button"
        testID="one-native-android-decoy"
        composeStyle={{ ...boxStyle, width: 180 }}
      >
        <One.Android.Text
          accessibilityRole="text"
          testID="one-native-android-decoy-label"
          text="Tap real button"
        />
      </One.Android.Box>
    </One.Android.Column>
  )
}
