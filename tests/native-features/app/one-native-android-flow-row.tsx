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
    </One.Android.Column>
  )
}
