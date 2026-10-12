import { useState } from 'react'
import { One } from 'one'

export default function OneNativeAndroidSelection() {
  const [value, setValue] = useState(false)
  const [requested, setRequested] = useState(false)
  const [reject, setReject] = useState(true)
  const [revision, setRevision] = useState(0)
  const [disabledRequests, setDisabledRequests] = useState(0)
  const [radio, setRadio] = useState<'first' | 'second'>('first')
  const [radioClicks, setRadioClicks] = useState(0)
  const [disabledRadioClicks, setDisabledRadioClicks] = useState(0)

  return (
    <One.Android.Column
      testID="one-native-android-selection-screen"
      style={{ flex: 1 }}
      spacing={8}
      composeStyle={{ padding: 16, fillMaxWidth: true, fillMaxHeight: true }}
    >
      <One.Android.Text
        testID="one-native-android-checkbox-status"
        text={`Value: ${value ? 'on' : 'off'} · Request: ${requested ? 'on' : 'off'} · Policy: ${reject ? 'reject' : 'accept'} · Revision: ${revision}`}
      />
      <One.Android.Row spacing={8}>
        <One.Android.Checkbox
          testID="one-native-android-checkbox-control"
          accessibilityLabel="Controlled checkbox"
          value={value}
          revision={revision}
          onCheckedChange={(next) => {
            setRequested(next)
            if (!reject) setValue(next)
          }}
        />
        <One.Android.Button
          testID="one-native-android-checkbox-policy"
          label={reject ? 'Accept' : 'Reject'}
          onPress={() => setReject((current) => !current)}
        />
        <One.Android.Button
          testID="one-native-android-checkbox-reset"
          label="Reset"
          onPress={() => {
            setValue(false)
            setRequested(false)
            setRevision((current) => current + 1)
          }}
        />
      </One.Android.Row>
      <One.Android.Text
        testID="one-native-android-radio-status"
        text={`Radio: ${radio} · Clicks: ${radioClicks} · Disabled clicks: ${disabledRadioClicks}`}
      />
      <One.Android.Row spacing={8}>
        <One.Android.RadioButton
          testID="one-native-android-radio-first"
          accessibilityLabel="First radio"
          selected={radio === 'first'}
          onClick={() => {
            setRadio('first')
            setRadioClicks((count) => count + 1)
          }}
        />
        <One.Android.RadioButton
          testID="one-native-android-radio-second"
          accessibilityLabel="Second radio"
          selected={radio === 'second'}
          onClick={() => {
            setRadio('second')
            setRadioClicks((count) => count + 1)
          }}
        />
        <One.Android.RadioButton
          testID="one-native-android-radio-readonly"
          accessibilityLabel="Read only radio"
          selected
        />
        <One.Android.RadioButton
          testID="one-native-android-radio-disabled"
          accessibilityLabel="Disabled radio"
          selected={false}
          disabled
          onClick={() => setDisabledRadioClicks((count) => count + 1)}
        />
      </One.Android.Row>
      <One.Android.Text text={`Disabled requests: ${disabledRequests}`} testID="one-native-android-checkbox-disabled-status" />
      <One.Android.Row spacing={8}>
        <One.Android.Checkbox
          testID="one-native-android-checkbox-readonly"
          accessibilityLabel="Read only checkbox"
          value
        />
        <One.Android.Checkbox
          testID="one-native-android-checkbox-disabled"
          accessibilityLabel="Disabled checkbox"
          value={false}
          disabled
          onCheckedChange={() => setDisabledRequests((count) => count + 1)}
        />
      </One.Android.Row>
    </One.Android.Column>
  )
}
