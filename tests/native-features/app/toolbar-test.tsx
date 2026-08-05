import { useState } from 'react'
import { Color, StackToolbar } from '@vxrn/native'
import { View, Text, ScrollView, StyleSheet, Platform } from 'react-native'

export default function ToolbarTestScreen() {
  const [lastAction, setLastAction] = useState<string>('none')
  const [actionCount, setActionCount] = useState(0)
  const isIOS = Platform.OS === 'ios'

  const handleAction = (action: string) => {
    setLastAction(action)
    setActionCount((c) => c + 1)
  }

  return (
    <View style={styles.container} testID="toolbar-test-screen">
      <StackToolbar placement="right">
        <StackToolbar.Button icon="bell" onPress={() => handleAction('notifications')}>
          <StackToolbar.Label>Notifications</StackToolbar.Label>
          <StackToolbar.Badge>3</StackToolbar.Badge>
        </StackToolbar.Button>
        <StackToolbar.Menu icon="ellipsis.circle" title="Actions">
          <StackToolbar.MenuAction
            icon="square.and.arrow.up"
            onPress={() => handleAction('share')}
          >
            Share
          </StackToolbar.MenuAction>
          <StackToolbar.MenuAction
            icon="trash"
            destructive
            onPress={() => handleAction('delete')}
          >
            Delete
          </StackToolbar.MenuAction>
        </StackToolbar.Menu>
      </StackToolbar>

      <ScrollView contentContainerStyle={styles.content}>
        <Text testID="toolbar-test-title" style={styles.title}>
          Toolbar Test
        </Text>

        <Text testID="toolbar-test-platform" style={styles.sectionLabel}>
          Platform: {Platform.OS}
        </Text>

        {/* status display */}
        <View testID="toolbar-status" style={styles.statusCard}>
          <Text style={styles.statusLabel}>Last Action:</Text>
          <Text testID="toolbar-last-action" style={styles.statusValue}>
            {lastAction}
          </Text>
          <Text style={styles.statusLabel}>Action Count:</Text>
          <Text testID="toolbar-action-count" style={styles.statusValue}>
            {actionCount}
          </Text>
        </View>

        {/* toolbar items description */}
        <Text testID="section-toolbar-items" style={styles.sectionTitle}>
          Toolbar Items
        </Text>

        <View testID="toolbar-items-list" style={styles.itemsList}>
          <View testID="toolbar-item-desc-add" style={styles.itemRow}>
            <Text style={styles.itemIcon}>+</Text>
            <Text style={styles.itemLabel}>Add - normal button with system icon</Text>
          </View>
          <View testID="toolbar-item-desc-search" style={styles.itemRow}>
            <Text style={styles.itemIcon}>🔍</Text>
            <Text style={styles.itemLabel}>Search - search bar type</Text>
          </View>
          <View testID="toolbar-item-desc-spacer" style={styles.itemRow}>
            <Text style={styles.itemIcon}>↔</Text>
            <Text style={styles.itemLabel}>Fluid spacer</Text>
          </View>
          <View testID="toolbar-item-desc-share" style={styles.itemRow}>
            <Text style={styles.itemIcon}>↑</Text>
            <Text style={styles.itemLabel}>Share - prominent style</Text>
          </View>
          <View testID="toolbar-item-desc-settings" style={styles.itemRow}>
            <Text style={styles.itemIcon}>⚙</Text>
            <Text style={styles.itemLabel}>Settings - with badge</Text>
          </View>
          <View testID="toolbar-item-desc-disabled" style={styles.itemRow}>
            <Text style={styles.itemIcon}>✕</Text>
            <Text style={styles.itemLabel}>Disabled - disabled button</Text>
          </View>
        </View>

        <View testID="toolbar-render-status" style={styles.statusBar}>
          <Text testID="toolbar-render-complete" style={styles.statusBarText}>
            Toolbar test rendered
          </Text>
        </View>
      </ScrollView>

      {/* native toolbar host with items */}
      <StackToolbar>
        <StackToolbar.Button
          icon="plus"
          tintColor={isIOS ? Color.ios.systemBlue : undefined}
          onPress={() => handleAction('add')}
        >
          Add
        </StackToolbar.Button>

        <StackToolbar.SearchBarSlot />

        <StackToolbar.Spacer />

        <StackToolbar.Button
          icon="square.and.arrow.up"
          variant="prominent"
          onPress={() => handleAction('share')}
        >
          Share
        </StackToolbar.Button>

        <StackToolbar.Button icon="gearshape" onPress={() => handleAction('settings')}>
          <StackToolbar.Label>Settings</StackToolbar.Label>
          <StackToolbar.Badge
            style={{ backgroundColor: isIOS ? Color.ios.systemRed : 'red' }}
          >
            3
          </StackToolbar.Badge>
        </StackToolbar.Button>

        <StackToolbar.Spacer width={20} />

        <StackToolbar.Button
          icon="xmark"
          disabled
          onPress={() => handleAction('disabled')}
        >
          Disabled
        </StackToolbar.Button>
      </StackToolbar>
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
    paddingTop: 60,
    paddingBottom: 120,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  sectionLabel: {
    fontSize: 13,
    color: '#888',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 8,
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
  itemsList: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
    gap: 12,
  },
  itemIcon: {
    fontSize: 18,
    width: 30,
    textAlign: 'center',
  },
  itemLabel: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  statusBar: {
    marginTop: 24,
    padding: 12,
    backgroundColor: '#e8f5e9',
    borderRadius: 8,
    alignItems: 'center',
  },
  statusBarText: {
    fontSize: 14,
    color: '#2e7d32',
    fontWeight: '600',
  },
})
