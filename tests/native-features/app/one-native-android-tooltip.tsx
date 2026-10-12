import { One } from 'one'

export default function OneNativeAndroidTooltip() {
  return (
    <One.Android.Column
      testID="one-native-android-tooltip-screen"
      style={{ flex: 1 }}
      spacing={8}
      composeStyle={{ padding: 16, fillMaxWidth: true, fillMaxHeight: true }}
    >
      <One.Android.Text
        testID="one-native-android-tooltip-status"
        text="Long-press a target"
      />
      <One.Android.Button
        testID="one-native-android-tooltip-decoy"
        label="Decoy"
        variant="text"
      />
      <One.Android.TooltipBox
        testID="one-native-android-tooltip-plain"
        text="Save the file"
      >
        <One.Android.Button
          testID="one-native-android-tooltip-plain-target"
          label="Plain tip"
          variant="tonal"
        />
      </One.Android.TooltipBox>
      <One.Android.TooltipBox
        testID="one-native-android-tooltip-rich"
        title="Sync"
        text="Syncs automatically"
      >
        <One.Android.Button
          testID="one-native-android-tooltip-rich-target"
          label="Rich tip"
          variant="outlined"
        />
      </One.Android.TooltipBox>
      <One.Android.TooltipBox
        testID="one-native-android-tooltip-disabled"
        text="Never shown"
        enabled={false}
      >
        <One.Android.Button
          testID="one-native-android-tooltip-disabled-target"
          label="Quiet tip"
          variant="outlined"
        />
      </One.Android.TooltipBox>
    </One.Android.Column>
  )
}
