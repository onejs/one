import { View, Text, StyleSheet } from 'react-native'

export default function StickyTest() {
  return (
    <View style={styles.container}>
      <View style={styles.stickyHeader}>
        <Text style={styles.headerText}>
          Sticky Header - should stay at top when scrolling
        </Text>
      </View>

      <View style={styles.content}>
        {Array.from({ length: 50 }).map((_, i) => (
          <View key={i} style={styles.item}>
            <Text>Content item {i + 1}</Text>
          </View>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  stickyHeader: {
    // @ts-ignore - sticky works on web
    position: 'sticky',
    top: 0,
    backgroundColor: 'red',
    padding: 20,
    zIndex: 10,
  },
  headerText: {
    color: 'white',
    fontWeight: 'bold',
  },
  content: {
    padding: 20,
  },
  item: {
    padding: 20,
    marginBottom: 10,
    backgroundColor: '#e0e0e0',
  },
})
