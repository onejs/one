import { ScrollView, StyleSheet, Text, View } from 'react-native'

const ROWS = Array.from({ length: 60 }, (_, index) => `Row ${index + 1}`)

export default function DoubleBarFeed() {
  return (
    <View testID="bars-double-feed" style={styles.container}>
      <ScrollView testID="bars-double-scroll" contentContainerStyle={styles.content}>
        <Text testID="bars-double-title" style={styles.title}>
          Double Bar
        </Text>
        {ROWS.map((row) => (
          <View key={row} style={styles.row}>
            <Text style={styles.rowText}>{row}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 16,
    paddingBottom: 160,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  row: {
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 10,
    marginBottom: 8,
  },
  rowText: {
    fontSize: 15,
  },
})
