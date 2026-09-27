import { useState } from 'react'
import { One } from 'one'

export default function OneNativeAndroidSegmented() {
  const [single, setSingle] = useState('First')
  const [checked, setChecked] = useState(false)
  const [policy, setPolicy] = useState<'reject' | 'accept'>('reject')
  const [requests, setRequests] = useState(0)
  const [disabledPresses, setDisabledPresses] = useState(0)

  return (
    <One.Android.Column testID="one-native-android-segmented-screen" style={{ flex: 1 }} spacing={20} composeStyle={{ padding: 24, fillMaxWidth: true, fillMaxHeight: true }}>
      <One.Android.Text text="Single choice" />
      <One.Android.SingleChoiceSegmentedButtonRow testID="one-native-android-segmented-single-row">
        <One.Android.SegmentedButton testID="one-native-android-segmented-first" selected={single === 'First'} onClick={() => setSingle('First')}>
          <One.Android.Text text="First" />
        </One.Android.SegmentedButton>
        <One.Android.SegmentedButton testID="one-native-android-segmented-second" selected={single === 'Second'} onClick={() => setSingle('Second')}>
          <One.Android.Text text="Second" />
        </One.Android.SegmentedButton>
        <One.Android.SegmentedButton testID="one-native-android-segmented-single-disabled" selected={false} enabled={false} onClick={() => setDisabledPresses((count) => count + 1)}>
          <One.Android.Text text="Third" />
        </One.Android.SegmentedButton>
      </One.Android.SingleChoiceSegmentedButtonRow>
      <One.Android.Text text="Multi choice" />
      <One.Android.MultiChoiceSegmentedButtonRow testID="one-native-android-segmented-multi-row">
        <One.Android.SegmentedButton testID="one-native-android-segmented-multi-fixed" checked={true}>
          <One.Android.Text text="Fixed" />
        </One.Android.SegmentedButton>
        <One.Android.SegmentedButton
          testID="one-native-android-segmented-multi-control"
          checked={checked}
          onCheckedChange={(next) => {
            setRequests((count) => count + 1)
            if (policy === 'accept') setChecked(next)
          }}
        >
          <One.Android.Text text="Toggle" />
        </One.Android.SegmentedButton>
        <One.Android.SegmentedButton testID="one-native-android-segmented-multi-disabled" checked={false} enabled={false} onCheckedChange={() => setDisabledPresses((count) => count + 1)}>
          <One.Android.Text text="Off" />
        </One.Android.SegmentedButton>
      </One.Android.MultiChoiceSegmentedButtonRow>
      <One.Android.Button testID="one-native-android-segmented-policy" label="Accept requests" onPress={() => setPolicy('accept')} />
      <One.Android.Text testID="one-native-android-segmented-status" text={`Single: ${single} · Checked: ${checked ? 'yes' : 'no'} · Policy: ${policy} · Requests: ${requests} · Disabled: ${disabledPresses}`} />
    </One.Android.Column>
  )
}
