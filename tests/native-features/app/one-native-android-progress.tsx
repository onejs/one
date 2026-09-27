import { useState } from 'react'
import { One } from 'one'

export default function OneNativeAndroidProgress() {
  const [progress, setProgress] = useState(0.25)

  return (
    <One.Android.Column
      testID="one-native-android-progress-screen"
      style={{ flex: 1 }}
      spacing={20}
      composeStyle={{ padding: 24, fillMaxWidth: true, fillMaxHeight: true }}
    >
      <One.Android.Text text="Material progress indicators" />
      <One.Android.LinearProgressIndicator
        testID="one-native-android-progress-linear"
        composeStyle={{ fillMaxWidth: true }}
        progress={progress}
        color="#2154a1"
        trackColor="#c7d9ec"
        strokeCap="butt"
        gapSize={10}
        drawStopIndicator={{ color: '#d22b3a', strokeCap: 'square', stopSize: 12 }}
      />
      <One.Android.LinearWavyProgressIndicator
        testID="one-native-android-progress-linear-wavy"
        composeStyle={{ fillMaxWidth: true }}
        progress={progress}
        color="#2154a1"
        trackColor="#c7d9ec"
        stopSize={12}
        amplitude={0.5}
        wavelength={28}
        waveSpeed={0}
      />
      <One.Android.Row spacing={36}>
        <One.Android.CircularProgressIndicator testID="one-native-android-progress-circular" progress={progress} strokeWidth={9} strokeCap="square" gapSize={8} />
        <One.Android.CircularWavyProgressIndicator testID="one-native-android-progress-circular-wavy" progress={progress} amplitude={0.2} wavelength={28} waveSpeed={0} />
      </One.Android.Row>
      <One.Android.LinearWavyProgressIndicator testID="one-native-android-progress-linear-indeterminate" composeStyle={{ fillMaxWidth: true }} amplitude={0.5} wavelength={28} waveSpeed={0} />
      <One.Android.CircularWavyProgressIndicator testID="one-native-android-progress-circular-indeterminate" amplitude={0.2} wavelength={28} waveSpeed={0} />
      <One.Android.Button testID="one-native-android-progress-advance" label="Advance" onPress={() => setProgress(0.75)} />
      <One.Android.Text testID="one-native-android-progress-status" text={`Progress: ${progress}`} />
    </One.Android.Column>
  )
}
