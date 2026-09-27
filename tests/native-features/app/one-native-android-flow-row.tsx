import { One } from 'one'

export default function OneNativeAndroidFlowRow() {
  return (
    <One.Android.Column
      testID="one-native-android-flow-row-screen"
      style={{ flex: 1 }}
      composeStyle={{ padding: 24, fillMaxWidth: true, fillMaxHeight: true }}
    >
      <One.Android.FlowRow
        testID="one-native-android-flow-row"
        composeStyle={{ fillMaxWidth: true }}
        horizontalArrangement={{ spacedBy: 12 }}
        verticalArrangement={{ spacedBy: 16 }}
      >
        {[0, 1, 2, 3, 4].map((index) => (
          <One.Android.Box
            key={index}
            testID={`one-native-android-flow-cell-${index}`}
            contentAlignment="center"
            composeStyle={{ width: 140, height: 56, cornerRadius: 12, backgroundColor: '#dceeff' }}
          >
            <One.Android.Text text={`Cell ${index + 1}`} />
          </One.Android.Box>
        ))}
      </One.Android.FlowRow>
      <One.Android.Row
        testID="one-native-android-spacer-row"
        verticalAlignment="centerVertically"
        composeStyle={{ fillMaxWidth: true, height: 56 }}
      >
        <One.Android.Text testID="one-native-android-spacer-left" text="Left" />
        <One.Android.Spacer composeStyle={{ weight: 1 }} />
        <One.Android.Text testID="one-native-android-spacer-right" text="Right" />
      </One.Android.Row>
      <One.Android.Column
        testID="one-native-android-spacer-column"
        composeStyle={{ fillMaxWidth: true, height: 240, backgroundColor: '#e7f1ed' }}
      >
        <One.Android.Text testID="one-native-android-spacer-top" text="Top" />
        <One.Android.Spacer composeStyle={{ weight: 1 }} />
        <One.Android.Text testID="one-native-android-spacer-bottom" text="Bottom" />
      </One.Android.Column>
    </One.Android.Column>
  )
}
