import { useState } from 'react'
import { One } from 'one'

export default function OneNativeAndroidLoading() {
  const [progress, setProgress] = useState(0.25)

  return (
    <One.Android.Column
      testID="one-native-android-loading-screen"
      style={{ flex: 1 }}
      spacing={24}
      composeStyle={{ padding: 24, fillMaxWidth: true, fillMaxHeight: true }}
    >
      <One.Android.Text text="Material loading indicators" />
      <One.Android.Row spacing={32}>
        <One.Android.LoadingIndicator testID="one-native-android-loading-indeterminate" color="#2154a1" />
        <One.Android.ContainedLoadingIndicator
          testID="one-native-android-loading-contained"
          color="#ffffff"
          containerColor="#2154a1"
        />
      </One.Android.Row>
      <One.Android.Row spacing={32}>
        <One.Android.LoadingIndicator testID="one-native-android-loading-determinate" progress={progress} color="#2154a1" />
        <One.Android.ContainedLoadingIndicator
          testID="one-native-android-loading-contained-determinate"
          progress={progress}
          color="#ffffff"
          containerColor="#2154a1"
        />
      </One.Android.Row>
      <One.Android.Button testID="one-native-android-loading-advance" label="Advance" onPress={() => setProgress(0.75)} />
      <One.Android.Text testID="one-native-android-loading-status" text={`Progress: ${progress}`} />
    </One.Android.Column>
  )
}
