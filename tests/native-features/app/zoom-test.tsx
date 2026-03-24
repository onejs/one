import { useRouter } from 'one'
import { ZoomTransitionSource } from '@vxrn/native'
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native'

const items = [
  { id: 'item-1', title: 'Mountain View', color: '#4A90D9' },
  { id: 'item-2', title: 'Ocean Breeze', color: '#50C878' },
  { id: 'item-3', title: 'Sunset Glow', color: '#FF6B6B' },
  { id: 'item-4', title: 'Purple Haze', color: '#9B59B6' },
  { id: 'item-5', title: 'Golden Hour', color: '#F39C12' },
  { id: 'item-6', title: 'Midnight Blue', color: '#2C3E50' },
]

export default function ZoomTestScreen() {
  const router = useRouter()

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      testID="zoom-test-screen"
    >
      <Text testID="zoom-test-title" style={styles.title}>
        Zoom Transition Test
      </Text>
      <Text style={styles.description}>Tap a card to test zoom transition animation</Text>

      <View style={styles.grid} testID="zoom-items-grid">
        {items.map((item) => (
          <ZoomTransitionSource key={item.id} identifier={item.id}>
            <Pressable
              testID={`zoom-source-${item.id}`}
              style={[styles.card, { backgroundColor: item.color }]}
              onPress={() =>
                router.push({
                  pathname: '/zoom-detail',
                  params: { id: item.id, title: item.title, color: item.color },
                } as any)
              }
            >
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardId}>{item.id}</Text>
            </Pressable>
          </ZoomTransitionSource>
        ))}
      </View>

      <View testID="zoom-source-status" style={styles.statusBar}>
        <Text testID="zoom-source-complete" style={styles.statusText}>
          {items.length} zoom sources rendered
        </Text>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { padding: 16, paddingTop: 60, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 4 },
  description: { fontSize: 14, color: '#666', marginBottom: 16 },
  grid: { gap: 12 },
  card: {
    padding: 20,
    borderRadius: 16,
    minHeight: 100,
    justifyContent: 'flex-end',
  },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  cardId: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  statusBar: {
    marginTop: 20,
    padding: 12,
    backgroundColor: '#e8f5e9',
    borderRadius: 8,
    alignItems: 'center',
  },
  statusText: { fontSize: 14, color: '#2e7d32', fontWeight: '600' },
})
