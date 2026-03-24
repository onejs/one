import { useState } from 'react'
import { MenuAction, Color } from '@vxrn/native'
import { View, Text, ScrollView, StyleSheet, Platform } from 'react-native'

export default function MenuTestScreen() {
  const [lastAction, setLastAction] = useState<string>('none')
  const [actionCount, setActionCount] = useState(0)
  const isIOS = Platform.OS === 'ios'

  const handleAction = (action: string) => {
    setLastAction(action)
    setActionCount((c) => c + 1)
  }

  return (
    <View style={styles.container} testID="menu-test-screen">
      <ScrollView contentContainerStyle={styles.content}>
        <Text testID="menu-test-title" style={styles.title}>
          Menu Action Test
        </Text>

        <Text testID="menu-test-platform" style={styles.sectionLabel}>
          Platform: {Platform.OS}
        </Text>

        {/* status display */}
        <View testID="menu-status" style={styles.statusCard}>
          <Text style={styles.statusLabel}>Last Action:</Text>
          <Text testID="menu-last-action" style={styles.statusValue}>
            {lastAction}
          </Text>
          <Text style={styles.statusLabel}>Action Count:</Text>
          <Text testID="menu-action-count" style={styles.statusValue}>
            {actionCount}
          </Text>
        </View>

        {/* menu actions section */}
        <Text testID="section-menu-actions" style={styles.sectionTitle}>
          Menu Actions
        </Text>

        <View testID="menu-actions-container" style={styles.actionsContainer}>
          {/* basic menu action */}
          <View testID="menu-action-edit-wrapper" style={styles.actionWrapper}>
            <MenuAction
              identifier="edit-action"
              title="Edit"
              icon="pencil"
              subtitle="Edit this item"
              onSelected={() => handleAction('edit')}
            />
            <Text style={styles.actionDescription}>
              Basic action with icon + subtitle
            </Text>
          </View>

          {/* destructive menu action */}
          <View testID="menu-action-delete-wrapper" style={styles.actionWrapper}>
            <MenuAction
              identifier="delete-action"
              title="Delete"
              icon="trash"
              destructive
              tintColor={isIOS ? Color.ios.systemRed : undefined}
              onSelected={() => handleAction('delete')}
            />
            <Text style={styles.actionDescription}>Destructive action</Text>
          </View>

          {/* disabled menu action */}
          <View testID="menu-action-disabled-wrapper" style={styles.actionWrapper}>
            <MenuAction
              identifier="disabled-action"
              title="Cannot Do This"
              icon="xmark.circle"
              disabled
              onSelected={() => handleAction('disabled')}
            />
            <Text style={styles.actionDescription}>Disabled action</Text>
          </View>

          {/* action with discoverability label */}
          <View testID="menu-action-share-wrapper" style={styles.actionWrapper}>
            <MenuAction
              identifier="share-action"
              title="Share"
              icon="square.and.arrow.up"
              discoverabilityLabel="Share this content"
              accessibilityLabel="Share content"
              onSelected={() => handleAction('share')}
            />
            <Text style={styles.actionDescription}>
              With discoverability + accessibility labels
            </Text>
          </View>

          {/* toggled action */}
          <View testID="menu-action-toggle-wrapper" style={styles.actionWrapper}>
            <MenuAction
              identifier="toggle-action"
              title="Favorite"
              icon="star.fill"
              isOn={lastAction === 'toggle'}
              tintColor={isIOS ? Color.ios.systemYellow : undefined}
              onSelected={() => handleAction('toggle')}
            />
            <Text style={styles.actionDescription}>Toggle action (isOn)</Text>
          </View>

          {/* hidden action */}
          <View testID="menu-action-hidden-wrapper" style={styles.actionWrapper}>
            <MenuAction
              identifier="hidden-action"
              title="Hidden Action"
              icon="eye.slash"
              hidden
              onSelected={() => handleAction('hidden')}
            />
            <Text style={styles.actionDescription}>
              Hidden action (should not appear)
            </Text>
          </View>
        </View>

        <View testID="menu-render-status" style={styles.statusBar}>
          <Text testID="menu-render-complete" style={styles.statusBarText}>
            Menu test rendered
          </Text>
        </View>
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
    paddingTop: 60,
    paddingBottom: 40,
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
  actionsContainer: {
    gap: 12,
  },
  actionWrapper: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  actionDescription: {
    fontSize: 12,
    color: '#888',
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
