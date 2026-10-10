import { One } from 'one'

export default function OneNativeAndroidCards() {
  return (
    <One.Android.Column
      testID="one-native-android-cards-screen"
      style={{ flex: 1 }}
      spacing={16}
      composeStyle={{ padding: 16, fillMaxWidth: true, fillMaxHeight: true }}
    >
      <One.Android.Card
        testID="one-native-android-card-filled"
        composeStyle={{ fillMaxWidth: true }}
        colors={{ containerColor: '#d5e8ff', contentColor: '#102030' }}
        border={{ width: 2, color: '#1c4587' }}
      >
        <One.Android.Column composeStyle={{ padding: 16 }}>
          <One.Android.Text text="Filled card" testID="one-native-android-card-filled-text" />
        </One.Android.Column>
      </One.Android.Card>
      <One.Android.ElevatedCard
        testID="one-native-android-card-elevated"
        composeStyle={{ fillMaxWidth: true }}
        elevation={4}
      >
        <One.Android.Column composeStyle={{ padding: 16 }}>
          <One.Android.Text text="Elevated card" testID="one-native-android-card-elevated-text" />
        </One.Android.Column>
      </One.Android.ElevatedCard>
      <One.Android.OutlinedCard
        testID="one-native-android-card-outlined"
        composeStyle={{ fillMaxWidth: true }}
        border={{ width: 2, color: '#a62020' }}
      >
        <One.Android.Column composeStyle={{ padding: 16 }}>
          <One.Android.Text text="Outlined card" testID="one-native-android-card-outlined-text" />
        </One.Android.Column>
      </One.Android.OutlinedCard>
    </One.Android.Column>
  )
}
