import { StyleSheet, Text, View } from 'react-native'

export default function ProbePlainScreen() {
  return (
    <View testID="bars-probe-plain" style={styles.container}>
      <Text testID="bars-probe-plain-title" style={styles.title}>
        Plain Tab
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
  },
})
