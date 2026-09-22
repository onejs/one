import { StyleSheet, Text, View } from 'react-native'

export default function DoubleBarSaved() {
  return (
    <View testID="bars-double-saved" style={styles.container}>
      <Text testID="bars-double-saved-title" style={styles.title}>
        Saved
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
