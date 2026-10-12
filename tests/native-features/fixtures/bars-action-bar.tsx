import { useCallback, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Stack } from 'one'

/**
 * Track A: action bar in clusters. One plain leading cluster, one flexible
 * spacer, one trailing cluster with a single prominent tinted action and a
 * plain overflow menu. Follows the bar HIG rules: one prominent action per
 * toolbar, placed trailing; one shared glass surface per cluster; one tint.
 */
export default function ActionBarScreen() {
  const [withSpacer, setWithSpacer] = useState(true)
  const [lastAction, setLastAction] = useState('none')
  const [actionCount, setActionCount] = useState(0)

  const handleAction = useCallback((action: string) => {
    setLastAction(action)
    setActionCount((count) => count + 1)
  }, [])

  return (
    <View testID="bars-action-screen" style={styles.container}>
      <Stack.Toolbar>
        <Stack.Toolbar.Button
          icon="bookmark"
          accessibilityLabel="Save item"
          onPress={() => handleAction('save')}
        >
          Save
        </Stack.Toolbar.Button>
        <Stack.Toolbar.Button
          icon="tag"
          accessibilityLabel="Tag item"
          onPress={() => handleAction('tag')}
        >
          Tag
        </Stack.Toolbar.Button>
        {withSpacer ? <Stack.Toolbar.Spacer /> : null}
        <Stack.Toolbar.Button
          icon="square.and.arrow.up"
          variant="prominent"
          tintColor="#ff2d55"
          accessibilityLabel="Share item"
          onPress={() => handleAction('share')}
        >
          <Stack.Toolbar.Label>Share</Stack.Toolbar.Label>
          <Stack.Toolbar.Badge>3</Stack.Toolbar.Badge>
        </Stack.Toolbar.Button>
        <Stack.Toolbar.Menu
          icon="ellipsis"
          title="More actions"
          accessibilityLabel="More actions"
        >
          <Stack.Toolbar.MenuAction
            icon="doc.on.doc"
            onPress={() => handleAction('duplicate')}
          >
            Duplicate
          </Stack.Toolbar.MenuAction>
          <Stack.Toolbar.MenuAction
            icon="trash"
            destructive
            onPress={() => handleAction('delete')}
          >
            Delete
          </Stack.Toolbar.MenuAction>
        </Stack.Toolbar.Menu>
      </Stack.Toolbar>

      <View style={styles.content}>
        <Text testID="bars-action-title" style={styles.title}>
          Action Bar
        </Text>
        <View testID="bars-action-status" style={styles.statusCard}>
          <Text style={styles.statusLabel}>Last Action:</Text>
          <Text testID="bars-action-last-action" style={styles.statusValue}>
            {lastAction}
          </Text>
          <Text style={styles.statusLabel}>Action Count:</Text>
          <Text testID="bars-action-count" style={styles.statusValue}>
            {actionCount}
          </Text>
          <Text testID="bars-action-spacer-state" style={styles.statusValue}>
            {withSpacer ? 'spacer-on' : 'spacer-off'}
          </Text>
        </View>
        <Pressable
          testID="bars-action-spacer-toggle"
          style={styles.toggle}
          onPress={() => setWithSpacer((value) => !value)}
        >
          <Text style={styles.toggleText}>Toggle spacer</Text>
        </Pressable>
      </View>
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
    gap: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  statusCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    gap: 4,
  },
  statusLabel: {
    fontSize: 12,
    color: '#888',
    fontWeight: '500',
  },
  statusValue: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  toggle: {
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  toggleText: {
    fontSize: 15,
    fontWeight: '600',
  },
})
