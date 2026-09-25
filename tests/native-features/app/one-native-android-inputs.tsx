import { useState } from 'react'
import { One } from 'one'

const rootStyle = { flex: 1 } as const
const rowStyle = { fillMaxWidth: true } as const
const fieldStyle = { fillMaxWidth: true } as const

export default function OneNativeAndroidInputs() {
  const [name, setName] = useState('')
  const [nameRequest, setNameRequest] = useState('')
  const [rejectText, setRejectText] = useState(true)
  const [textRevision, setTextRevision] = useState(0)
  const [volume, setVolume] = useState(25)
  const [volumeRequest, setVolumeRequest] = useState(25)
  const [dialogVisible, setDialogVisible] = useState(false)
  const [dialogOutcome, setDialogOutcome] = useState('none')
  const [customVisible, setCustomVisible] = useState(false)
  const [customOutcome, setCustomOutcome] = useState('none')

  return (
    <One.Android.Column
      accessibilityLabel="One Native Android inputs proof"
      testID="one-native-android-inputs-screen"
      style={rootStyle}
      spacing={4}
      composeStyle={{ padding: 8, fillMaxWidth: true, fillMaxHeight: true }}
    >
      <One.Android.Text
        accessibilityRole="header"
        accessibilityLabel="Android inputs proof mounted"
        testID="one-native-android-inputs-mounted"
        text="Android inputs proof mounted"
      />

      <One.Android.Text
        testID="one-native-android-inputs-text-status"
        text={`Text: ${name} · Request: ${nameRequest} · Revision: ${textRevision}`}
      />
      <One.Android.TextField
        accessibilityLabel="Name field"
        label="Name"
        placeholder="Your name"
        text={name}
        onTextChange={(value) => {
          setNameRequest(value)
          if (!rejectText) setName(value)
        }}
        revision={textRevision}
        testID="one-native-android-inputs-textfield"
        composeStyle={fieldStyle}
      />
      <One.Android.Row
        testID="one-native-android-inputs-text-row"
        composeStyle={rowStyle}
        spacing={8}
      >
        <One.Android.Button
          accessibilityRole="button"
          accessibilityLabel={rejectText ? 'Accept text' : 'Reject text'}
          label={rejectText ? 'Accept text' : 'Reject text'}
          onPress={() => setRejectText((value) => !value)}
          testID="one-native-android-inputs-text-policy"
        />
        <One.Android.Button
          accessibilityRole="button"
          label="Reset text"
          tone="danger"
          onPress={() => {
            setName('')
            setNameRequest('')
            setTextRevision((value) => value + 1)
          }}
          testID="one-native-android-inputs-text-reset"
        />
      </One.Android.Row>

      <One.Android.Text
        testID="one-native-android-inputs-slider-status"
        text={`Slider: ${Math.round(volume)} · Request: ${Math.round(volumeRequest)}`}
      />
      <One.Android.Slider
        accessibilityLabel="Volume slider"
        value={volume}
        onValueChange={(value) => {
          setVolumeRequest(value)
          setVolume(value)
        }}
        minimumValue={0}
        maximumValue={100}
        step={5}
        testID="one-native-android-inputs-slider"
        composeStyle={fieldStyle}
      />
      <One.Android.Row
        testID="one-native-android-inputs-slider-row"
        composeStyle={rowStyle}
        spacing={8}
      >
        <One.Android.Button
          accessibilityRole="button"
          label="Volume -5"
          onPress={() => setVolume((value) => Math.max(0, value - 5))}
          testID="one-native-android-inputs-slider-down"
        />
        <One.Android.Button
          accessibilityRole="button"
          label="Volume +5"
          onPress={() => setVolume((value) => Math.min(100, value + 5))}
          testID="one-native-android-inputs-slider-up"
        />
      </One.Android.Row>

      <One.Android.Text
        testID="one-native-android-inputs-dialog-status"
        text={`Dialog: ${dialogOutcome}`}
      />
      <One.Android.Button
        accessibilityRole="button"
        label="Show dialog"
        onPress={() => setDialogVisible(true)}
        testID="one-native-android-inputs-dialog-show"
      />
      <One.Android.AlertDialog
        testID="one-native-android-inputs-alertdialog"
        visible={dialogVisible}
        title="Delete item?"
        message="This cannot be undone."
        confirmLabel="Delete"
        dismissLabel="Cancel"
        onConfirm={() => {
          setDialogVisible(false)
          setDialogOutcome('confirmed')
        }}
        onDismiss={() => {
          setDialogVisible(false)
          setDialogOutcome('dismissed')
        }}
      />

      <One.Android.Text
        testID="one-native-android-inputs-custom-status"
        text={`Custom dialog: ${customOutcome}`}
      />
      <One.Android.Button
        accessibilityRole="button"
        label="Show custom"
        onPress={() => setCustomVisible(true)}
        testID="one-native-android-inputs-custom-show"
      />
      <One.Android.Dialog
        testID="one-native-android-inputs-dialog"
        visible={customVisible}
        onDismiss={() => {
          setCustomVisible(false)
          setCustomOutcome('dismissed')
        }}
      >
        <One.Android.Box composeStyle={{ backgroundColor: '#FFFFFF', cornerRadius: 12, padding: 16 }}>
          <One.Android.Text
            testID="one-native-android-inputs-custom-body"
            text="Custom dialog body"
          />
          <One.Android.Button
            accessibilityRole="button"
            label="Close"
            onPress={() => {
              setCustomVisible(false)
              setCustomOutcome('closed')
            }}
            testID="one-native-android-inputs-custom-close"
          />
        </One.Android.Box>
      </One.Android.Dialog>

      <One.Android.Text
        testID="one-native-android-inputs-progress-status"
        text="Progress mounted"
      />
      <One.Android.ProgressIndicator
        variant="linear"
        progress={0.4}
        testID="one-native-android-inputs-progress-linear"
        composeStyle={fieldStyle}
      />
      <One.Android.ProgressIndicator
        testID="one-native-android-inputs-progress-circular"
      />
    </One.Android.Column>
  )
}
