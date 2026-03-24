import { useLocalSearchParams, useRouter, Stack } from 'one'
import { ZoomTransitionEnabler } from '@vxrn/native'
import { View, Text, Pressable, StyleSheet } from 'react-native'

export default function ZoomDetailScreen() {
  const { id, title, color } = useLocalSearchParams<{
    id: string
    title: string
    color: string
  }>()
  const router = useRouter()

  return (
    <View style={styles.container} testID="zoom-detail-screen">
      <Stack.Screen options={{ headerShown: false }} />
      <ZoomTransitionEnabler zoomTransitionSourceIdentifier={id || ''} />

      <View
        testID="zoom-detail-card"
        style={[styles.detailCard, { backgroundColor: color || '#4A90D9' }]}
      >
        <Text testID="zoom-detail-title" style={styles.detailTitle}>
          {title}
        </Text>
        <Text testID="zoom-detail-id" style={styles.detailSubtitle}>
          ID: {id}
        </Text>
      </View>

      <Pressable
        testID="zoom-back-button"
        style={styles.backButton}
        onPress={() => router.back()}
      >
        <Text style={styles.backButtonText}>← Back to list</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 16, paddingTop: 60 },
  detailCard: {
    padding: 32,
    borderRadius: 20,
    minHeight: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailTitle: { fontSize: 28, fontWeight: 'bold', color: '#fff' },
  detailSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 8 },
  backButton: {
    marginTop: 20,
    padding: 14,
    backgroundColor: '#fff',
    borderRadius: 12,
    alignItems: 'center',
  },
  backButtonText: { fontSize: 16, fontWeight: '600', color: '#333' },
})
