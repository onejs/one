import { useState } from 'react'
import { One } from 'one'

const items = Array.from({ length: 5 }, (_, index) => `Pull item ${index + 1}`)

export default function OneNativeAndroidPullToRefresh() {
  const [mode, setMode] = useState<'enabled' | 'disabled'>('enabled')
  const [refreshes, setRefreshes] = useState(0)
  const [refreshing, setRefreshing] = useState(false)

  const refresh = () => {
    setRefreshes((count) => count + 1)
    setRefreshing(true)
  }

  return (
    <One.Android.Column
      testID="one-native-android-pull-to-refresh-screen"
      style={{ flex: 1 }}
      spacing={8}
      composeStyle={{ padding: 16, fillMaxWidth: true, fillMaxHeight: true }}
    >
      <One.Android.Text
        testID="one-native-android-pull-to-refresh-status"
        text={`Mode: ${mode} · Refreshes: ${refreshes} · Refreshing: ${refreshing ? 'yes' : 'no'}`}
      />
      <One.Android.Row spacing={8}>
        <One.Android.Button
          testID="one-native-android-pull-to-refresh-toggle"
          label={mode === 'enabled' ? 'Disable' : 'Enable'}
          variant="tonal"
          onPress={() => setMode(mode === 'enabled' ? 'disabled' : 'enabled')}
        />
        <One.Android.Button
          testID="one-native-android-pull-to-refresh-finish"
          label="Finish"
          variant="outlined"
          onPress={() => setRefreshing(false)}
        />
        <One.Android.Button
          testID="one-native-android-pull-to-refresh-decoy"
          label="Decoy"
          variant="text"
        />
      </One.Android.Row>
      <One.Android.PullToRefreshBox
        testID="one-native-android-pull-to-refresh-box"
        isRefreshing={refreshing}
        onRefresh={refresh}
        enabled={mode === 'enabled'}
        composeStyle={{ height: 320, fillMaxWidth: true }}
      >
        <One.Android.LazyColumn
          testID="one-native-android-pull-to-refresh-list"
          composeStyle={{ fillMaxWidth: true, fillMaxHeight: true }}
        >
          {items.map((item, index) => (
            <One.Android.Text
              key={item}
              testID={`one-native-android-pull-to-refresh-item-${index + 1}`}
              text={item}
            />
          ))}
        </One.Android.LazyColumn>
      </One.Android.PullToRefreshBox>
    </One.Android.Column>
  )
}
