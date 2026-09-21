import { One, Stack, useRouter } from 'one'
import { useState } from 'react'
import {
  DynamicColorIOS,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'

const dynamicTint = DynamicColorIOS({ light: '#1465c0', dark: '#7fb3ff' })

export default function StackToolbarOracleScreen() {
  const router = useRouter()
  const insets = One.UI.SafeArea.useInsets()
  const [lastAction, setLastAction] = useState('none')
  const [actionCount, setActionCount] = useState(0)
  const [toolbarHidden, setToolbarHidden] = useState(false)
  // Route-local probe: nameless Stack.Screen applies toolbar options to the
  // current route through Screen's setOptions layout effect, so screen state
  // drives trailing items with no new API.
  const [routeTrailingHidden, setRouteTrailingHidden] = useState(false)
  // P2 lifecycle probe: empty items unmount the host (detach clears items);
  // unmount toggle drops the host with items present.
  const [bottomFull, setBottomFull] = useState(true)
  const [bottomMounted, setBottomMounted] = useState(true)

  const recordAction = (action: string) => {
    setLastAction(action)
    setActionCount((count) => count + 1)
  }

  return (
    <View style={styles.container} testID="stack-toolbar-oracle">
      <Stack.Screen>
        <Stack.Toolbar>
          <Stack.Toolbar.Trailing>
            <Stack.Toolbar.Item
              identifier="oracle-route-probe"
              title="Probe"
              systemImageName="magnifyingglass"
              hidden={routeTrailingHidden}
              accessibilityLabel="Oracle route probe"
              accessibilityHint="Toggles with screen state"
              onPress={() => recordAction('probe')}
            />
          </Stack.Toolbar.Trailing>
        </Stack.Toolbar>
      </Stack.Screen>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + 20,
            paddingBottom: insets.bottom + 120,
            paddingLeft: insets.left + 20,
            paddingRight: insets.right + 20,
          },
        ]}
      >
        <Text style={styles.title}>Stack.Toolbar oracle</Text>
        <Text testID="stack-toolbar-last-action">Menu action: {lastAction}</Text>
        <Text testID="stack-toolbar-action-count">Menu count: {actionCount}</Text>
        <Text testID="stack-toolbar-visibility">
          Toolbar: {toolbarHidden ? 'hidden' : 'visible'}
        </Text>
        <Text testID="stack-toolbar-route-trailing">
          Route trailing: {routeTrailingHidden ? 'hidden' : 'visible'}
        </Text>
        <Text testID="stack-toolbar-bottom-state">
          Bottom: {bottomMounted ? (bottomFull ? 'full' : 'empty') : 'unmounted'}
        </Text>
        <Text testID="stack-toolbar-safe-area">
          Insets: {insets.top}/{insets.bottom}/{insets.left}/{insets.right}
        </Text>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Toggle toolbar visibility"
          testID="stack-toolbar-toggle-visibility"
          style={styles.action}
          onPress={() => setToolbarHidden((hidden) => !hidden)}
        >
          <Text style={styles.actionText}>
            {toolbarHidden ? 'Show toolbar' : 'Hide toolbar'}
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Toggle route trailing item"
          testID="stack-toolbar-toggle-route-trailing"
          style={styles.action}
          onPress={() => setRouteTrailingHidden((hidden) => !hidden)}
        >
          <Text style={styles.actionText}>
            {routeTrailingHidden ? 'Show route item' : 'Hide route item'}
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Toggle bottom items"
          testID="stack-toolbar-toggle-bottom-items"
          style={styles.action}
          onPress={() => setBottomFull((full) => !full)}
        >
          <Text style={styles.actionText}>
            {bottomFull ? 'Empty bottom items' : 'Restore bottom items'}
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Toggle bottom host mount"
          testID="stack-toolbar-toggle-bottom-mounted"
          style={styles.action}
          onPress={() => setBottomMounted((mounted) => !mounted)}
        >
          <Text style={styles.actionText}>
            {bottomMounted ? 'Unmount bottom host' : 'Mount bottom host'}
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          testID="stack-toolbar-open-detail"
          style={styles.action}
          onPress={() => router.push('/stack-toolbar/detail')}
        >
          <Text style={styles.actionText}>Open detail owner</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          testID="stack-toolbar-back"
          style={styles.action}
          onPress={() => router.back()}
        >
          <Text style={styles.actionText}>Back</Text>
        </Pressable>
      </ScrollView>

      {bottomMounted && (
        <Stack.Toolbar.Bottom hidden={toolbarHidden} animated>
          {bottomFull && (
            <Stack.Toolbar.Item
              identifier="oracle-add"
              title="Add"
              systemImageName="plus"
              tintColor={dynamicTint}
              accessibilityLabel="Oracle bottom add"
              accessibilityHint="Adds an oracle entry"
              onSelected={() => recordAction('add')}
            />
          )}
          {bottomFull && (
            <Stack.Toolbar.Menu
              identifier="oracle-actions"
              title="Actions"
              label="Actions"
              systemImageName="ellipsis.circle"
              accessibilityLabel="Oracle bottom actions"
            >
              <Stack.Toolbar.Item
                identifier="oracle-mark"
                title="Mark reviewed"
                systemImageName="checkmark.circle"
                accessibilityLabel="Oracle mark reviewed"
                onSelected={() => recordAction('menu')}
              />
              <Stack.Toolbar.Item
                identifier="oracle-delete"
                title="Delete"
                systemImageName="trash"
                destructive
                accessibilityLabel="Oracle delete"
                onSelected={() => recordAction('delete')}
              />
              <Stack.Toolbar.Menu identifier="oracle-advanced" title="Advanced">
                <Stack.Toolbar.Item
                  identifier="oracle-inspect"
                  title="Inspect"
                  selected
                  accessibilityLabel="Oracle inspect"
                  onSelected={() => recordAction('inspect')}
                />
              </Stack.Toolbar.Menu>
            </Stack.Toolbar.Menu>
          )}
        </Stack.Toolbar.Bottom>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { gap: 16 },
  title: { fontSize: 22, fontWeight: '700' },
  action: {
    minHeight: 52,
    borderRadius: 12,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: { color: '#1465c0', fontSize: 16, fontWeight: '600' },
})
