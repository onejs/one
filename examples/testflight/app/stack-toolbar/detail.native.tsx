import { Stack, useRouter } from 'one'
import { Pressable, StyleSheet, Text, View } from 'react-native'

/**
 * P2 lifecycle probe, second owner. Push from the oracle index, then pop:
 * the shared navigation-controller toolbar must follow the top screen's
 * owner. If an empty visible toolbar (or the wrong owner's items) survives
 * any transition here, visibility ownership needs a native fix.
 */
export default function StackToolbarDetailScreen() {
  const router = useRouter()

  return (
    <View style={styles.container} testID="stack-toolbar-detail">
      <Text style={styles.title}>Toolbar detail owner</Text>
      <Text testID="stack-toolbar-detail-marker">Detail mounted</Text>

      <Pressable
        accessibilityRole="button"
        testID="stack-toolbar-detail-back"
        style={styles.action}
        onPress={() => router.back()}
      >
        <Text style={styles.actionText}>Back to oracle</Text>
      </Pressable>

      <Stack.Toolbar.Bottom>
        <Stack.Toolbar.Item
          identifier="detail-edit"
          title="Edit"
          systemImageName="pencil"
          accessibilityLabel="Detail bottom edit"
          onSelected={() => {}}
        />
        <Stack.Toolbar.Menu
          identifier="detail-actions"
          title="Actions"
          label="Actions"
          systemImageName="ellipsis.circle"
          accessibilityLabel="Detail bottom actions"
        >
          <Stack.Toolbar.Item
            identifier="detail-flag"
            title="Flag"
            systemImageName="flag"
            accessibilityLabel="Detail flag"
            onSelected={() => {}}
          />
        </Stack.Toolbar.Menu>
      </Stack.Toolbar.Bottom>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#eef3f8',
    padding: 20,
    gap: 16,
    alignItems: 'stretch',
    justifyContent: 'center',
  },
  title: { fontSize: 22, fontWeight: '700', textAlign: 'center' },
  action: {
    minHeight: 52,
    borderRadius: 12,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: { color: '#1465c0', fontSize: 16, fontWeight: '600' },
})
