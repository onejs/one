import { AppInfo } from '@vxrn/native/app-info'
import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'

// renders the One.AppInfo snapshot: version/build/applicationId read
// synchronously from the installed binary's constants. the conformance
// suites assert the exact fixture-manifest values (9.9.9/4242), proving
// prebuild stamping reaches runtime rather than template defaults.
// readings travel as labels because RN Text testIDs vanish from the
// accessibility snapshot while Pressable IDs survive.
export default function OneNativeAppInfo() {
  const [taps, setTaps] = useState(0)

  return (
    <View style={styles.screen}>
      <Text>{`Version: ${AppInfo.version ?? 'null'}`}</Text>
      <Text>{`Build: ${AppInfo.build ?? 'null'}`}</Text>
      <Text>{`ApplicationId: ${AppInfo.applicationId ?? 'null'}`}</Text>
      <Text>{`Taps: ${taps}`}</Text>
      <Pressable
        testID="one-native-app-info-refresh"
        style={styles.chip}
        onPress={() => setTaps((value) => value + 1)}
      >
        <Text>Refresh</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16, gap: 8 },
  chip: { padding: 12, backgroundColor: '#eee', borderRadius: 8 },
})
