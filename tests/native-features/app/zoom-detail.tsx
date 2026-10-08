import { useLocalSearchParams, useRouter, Stack, One } from 'one'
import { View, Text, Pressable, StyleSheet } from 'react-native'

export default function ZoomDetailScreen() {
  const { id, title, color, mode, mount } = useLocalSearchParams<{
    id: string
    title: string
    color: string
    mode: string
    mount: string
  }>()
  const router = useRouter()
  const card = (
    <View
      testID="zoom-detail-card"
      collapsable={false}
      style={[styles.detailCard, { backgroundColor: '#00e000' }]}
    >
      <Text testID="zoom-detail-title" style={styles.detailTitle}>
        {title}
      </Text>
      <Text testID="zoom-detail-id" style={styles.detailSubtitle}>
        ID: {id}
      </Text>
    </View>
  )

  return (
    <View style={styles.container} testID="zoom-detail-screen">
      <Stack.Screen options={{ headerShown: false }} />
      {mode !== 'omitted' && (
        <One.iOS.ZoomTransitionEnabler
          zoomTransitionSourceIdentifier={
            mode === 'mismatched' ? 'missing-source' : id || ''
          }
        />
      )}
      {mode === 'unaligned' ? (
        card
      ) : (
        <One.iOS.ZoomTransitionAlignmentRectDetector identifier={id || ''}>
          {card}
        </One.iOS.ZoomTransitionAlignmentRectDetector>
      )}
      <Text testID="zoom-detail-identity">{`mount:${mount};mode:${mode};source:${id};color:${color}`}</Text>

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
