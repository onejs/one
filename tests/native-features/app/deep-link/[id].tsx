import { useParams, usePathname } from 'one'
import { StyleSheet, Text, View } from 'react-native'

export default function DeepLinkScreen() {
  const params = useParams<{ id: string }>()
  const pathname = usePathname()

  return (
    <View testID="deep-link-screen" style={styles.container}>
      <Text testID="deep-link-title" style={styles.title}>
        Deep Link Test
      </Text>
      <Text testID="deep-link-id" style={styles.value}>
        ID: {params.id}
      </Text>
      <Text testID="deep-link-path" style={styles.value}>
        Path: {pathname}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  value: {
    fontSize: 18,
    color: '#333',
  },
})
